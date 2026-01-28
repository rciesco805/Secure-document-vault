import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getUserWithRole } from "@/lib/auth/with-role";
import { PlaidApi, Configuration, PlaidEnvironments, TransferType, TransferNetwork, ACHClass } from "plaid";

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { user, error, statusCode } = await getUserWithRole(req, res);

  if (!user || user.role !== "GP") {
    return res.status(statusCode || 403).json({ message: error || "GP access required" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Transaction ID required" });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        bankLink: true,
        investor: {
          select: {
            entityName: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "PENDING") {
      return res.status(400).json({ message: `Transaction is ${transaction.status}, cannot process` });
    }

    if (!transaction.bankLink?.processorToken) {
      return res.status(400).json({ message: "No processor token available for transfer" });
    }

    const teamFunds = await prisma.fund.findMany({
      where: { teamId: { in: user.teamIds } },
      select: { id: true },
    });

    if (!teamFunds.some((f) => f.id === transaction.fundId)) {
      return res.status(403).json({ message: "Transaction not in your team" });
    }

    let plaidTransferId: string | null = null;

    if (process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET) {
      try {
        const transferType = transaction.type === "CAPITAL_CALL" ? TransferType.Debit : TransferType.Credit;
        const network = TransferNetwork.Ach;
        const achClass = transaction.type === "CAPITAL_CALL" ? ACHClass.Ppd : ACHClass.Ccd;

        const response = await plaidClient.transferCreate({
          access_token: transaction.bankLink.plaidAccessToken,
          account_id: transaction.bankLink.plaidAccountId,
          type: transferType,
          network,
          amount: transaction.amount.toString(),
          ach_class: achClass,
          description: transaction.description || "BF Fund Transfer",
          user: {
            legal_name: transaction.investor?.entityName || 
                       transaction.investor?.user?.name || 
                       "Investor",
          },
        } as any);

        plaidTransferId = response.data.transfer.id;
      } catch (plaidError: any) {
        console.error("Plaid transfer error:", plaidError?.response?.data || plaidError);
        
        const existingAudit = Array.isArray(transaction.auditTrail) ? transaction.auditTrail : [];
        
        await prisma.transaction.update({
          where: { id },
          data: {
            status: "FAILED",
            statusMessage: plaidError?.response?.data?.error_message || "Plaid transfer failed",
            failedAt: new Date(),
            auditTrail: [
              ...existingAudit,
              {
                action: "PLAID_ERROR",
                timestamp: new Date().toISOString(),
                error: plaidError?.response?.data?.error_message || plaidError.message,
              },
            ],
          },
        });

        return res.status(500).json({ 
          message: "Plaid transfer failed",
          error: plaidError?.response?.data?.error_message,
        });
      }
    } else {
      plaidTransferId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: "PROCESSING",
        plaidTransferId,
        processedAt: new Date(),
        auditTrail: [
          ...(Array.isArray(transaction.auditTrail) ? transaction.auditTrail : []),
          {
            action: "PROCESSED",
            timestamp: new Date().toISOString(),
            userId: user.id,
            plaidTransferId,
          },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        plaidTransferId: updatedTransaction.plaidTransferId,
      },
    });
  } catch (error) {
    console.error("Error processing transaction:", error);
    return res.status(500).json({ message: "Failed to process transaction" });
  }
}
