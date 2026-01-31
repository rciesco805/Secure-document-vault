import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";
import { 
  isPlaidConfigured, 
  createTransferAuthorization, 
  createTransfer,
  decryptToken 
} from "@/lib/plaid";
import { CustomUser } from "@/lib/types";
import { logPaymentEvent } from "@/lib/audit/audit-logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ message: "Subscription ID is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        investorProfile: {
          include: {
            bankLinks: {
              where: { status: "ACTIVE" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(403).json({ message: "Investor profile not found" });
    }

    const investor = user.investorProfile;
    const bankLink = investor.bankLinks[0];

    if (!bankLink) {
      return res.status(400).json({ 
        message: "No bank account connected. Please connect a bank account first.",
        code: "NO_BANK_ACCOUNT"
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        investorId: investor.id,
      },
      include: {
        fund: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const signatureDoc = await prisma.signatureDocument.findUnique({
      where: { id: subscription.signatureDocumentId },
      include: { recipients: true },
    });

    if (subscription.status !== "SIGNED" && subscription.status !== "PENDING") {
      return res.status(400).json({ 
        message: `Subscription cannot be processed. Current status: ${subscription.status}` 
      });
    }

    const allSigned = signatureDoc?.recipients.every(
      (r: { status: string }) => r.status === "SIGNED"
    );

    if (!allSigned && subscription.status === "PENDING") {
      return res.status(400).json({ 
        message: "Subscription document must be signed before processing payment",
        code: "NOT_SIGNED"
      });
    }

    const existingTransactions = await prisma.transaction.findMany({
      where: {
        investorId: investor.id,
        type: "SUBSCRIPTION_PAYMENT",
        status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
      },
    });

    const subscriptionAmount = parseFloat(subscription.amount.toString());
    const duplicatePayment = existingTransactions.find((tx) => {
      const txMetadata = tx.metadata as Record<string, any> | null;
      if (txMetadata?.subscriptionId === subscriptionId) {
        return true;
      }
      const txAmount = parseFloat(tx.amount.toString());
      const amountMatch = Math.abs(txAmount - subscriptionAmount) < 0.01;
      const fundMatch = tx.fundId === subscription.fundId;
      const timeWindow = tx.createdAt >= subscription.createdAt;
      if (amountMatch && fundMatch && timeWindow) {
        return true;
      }
      return false;
    });

    if (duplicatePayment) {
      return res.status(400).json({ 
        message: "A payment is already pending or completed for this subscription",
        transactionId: duplicatePayment.id,
        status: duplicatePayment.status,
      });
    }

    if (!isPlaidConfigured()) {
      const transaction = await prisma.transaction.create({
        data: {
          investorId: investor.id,
          bankLinkId: bankLink.id,
          type: "SUBSCRIPTION_PAYMENT",
          amount: subscription.amount,
          currency: "USD",
          description: `Subscription payment for ${subscription.fund?.name || "fund"}`,
          fundId: subscription.fundId,
          status: "PENDING",
          statusMessage: "Plaid not configured - manual processing required",
          metadata: { subscriptionId: subscription.id },
        },
      });

      await logPaymentEvent(req, {
        eventType: "SUBSCRIPTION_PAYMENT_RECORDED",
        userId: user.id,
        teamId: subscription.fund?.teamId,
        transactionId: transaction.id,
        subscriptionId: subscription.id,
        investorId: investor.id,
        fundId: subscription.fundId,
        amount: subscription.amount.toString(),
      });

      return res.status(200).json({
        success: true,
        transaction: {
          id: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
        },
        message: "Payment recorded. Manual processing required.",
      });
    }

    const accessToken = decryptToken(bankLink.plaidAccessToken);
    const amount = subscription.amount.toString();

    const authResult = await createTransferAuthorization(
      accessToken,
      bankLink.plaidAccountId,
      amount,
      "debit",
      investor.entityName || user.name || "Investor",
      user.email || undefined
    );

    if (authResult.decision !== "approved") {
      const transaction = await prisma.transaction.create({
        data: {
          investorId: investor.id,
          bankLinkId: bankLink.id,
          type: "SUBSCRIPTION_PAYMENT",
          amount: subscription.amount,
          currency: "USD",
          description: `Subscription payment for ${subscription.fund?.name || "fund"}`,
          fundId: subscription.fundId,
          status: "FAILED",
          statusMessage: authResult.decisionRationale?.description || "Transfer not authorized",
          failedAt: new Date(),
          metadata: { subscriptionId: subscription.id },
        },
      });

      return res.status(400).json({
        success: false,
        message: "Payment authorization declined",
        reason: authResult.decisionRationale?.description,
        transactionId: transaction.id,
      });
    }

    const transferResult = await createTransfer(
      accessToken,
      bankLink.plaidAccountId,
      authResult.authorizationId,
      amount,
      `${subscription.fund?.name || "Fund"} Subscription`
    );

    const transaction = await prisma.transaction.create({
      data: {
        investorId: investor.id,
        bankLinkId: bankLink.id,
        type: "SUBSCRIPTION_PAYMENT",
        amount: subscription.amount,
        currency: "USD",
        description: `Subscription payment for ${subscription.fund?.name || "fund"}`,
        fundId: subscription.fundId,
        plaidTransferId: transferResult.transferId,
        transferType: "ach_debit",
        status: "PROCESSING",
        statusMessage: "ACH transfer initiated",
        metadata: { subscriptionId: subscription.id },
      },
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: "PAYMENT_PROCESSING",
      },
    });

    await logPaymentEvent(req, {
      eventType: "SUBSCRIPTION_PAYMENT_INITIATED",
      userId: user.id,
      teamId: subscription.fund?.teamId,
      transactionId: transaction.id,
      subscriptionId: subscription.id,
      investorId: investor.id,
      fundId: subscription.fundId,
      amount: subscription.amount.toString(),
      plaidTransferId: transferResult.transferId,
    });

    return res.status(200).json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        plaidTransferId: transferResult.transferId,
      },
      message: "Payment initiated successfully. Funds will be debited within 1-3 business days.",
    });
  } catch (error: any) {
    console.error("Error processing subscription payment:", error);
    return res.status(500).json({
      message: error.message || "Failed to process payment",
    });
  }
}
