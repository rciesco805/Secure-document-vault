import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function verifyPlaidWebhook(req: NextApiRequest): boolean {
  const plaidVerification = req.headers["plaid-verification"];
  
  if (!plaidVerification || !process.env.PLAID_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Plaid Webhook] Skipping verification in development");
      return true;
    }
    return false;
  }

  try {
    const signedJwt = plaidVerification as string;
    const [headerB64, payloadB64, signatureB64] = signedJwt.split(".");
    
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    
    const issuedAt = payload.iat * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - issuedAt > fiveMinutes) {
      console.log("[Plaid Webhook] Token expired");
      return false;
    }
    
    const bodyHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(req.body))
      .digest("hex");
      
    if (payload.request_body_sha256 !== bodyHash) {
      console.log("[Plaid Webhook] Body hash mismatch");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("[Plaid Webhook] Verification error:", error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!verifyPlaidWebhook(req)) {
    console.error("[Plaid Webhook] Verification failed");
    return res.status(401).json({ message: "Webhook verification failed" });
  }

  try {
    const webhookType = req.body.webhook_type;
    const webhookCode = req.body.webhook_code;

    console.log(`[Plaid Webhook] Type: ${webhookType}, Code: ${webhookCode}`);

    switch (webhookType) {
      case "TRANSFER_EVENTS":
        await handleTransferEvents(req.body);
        break;
      case "TRANSACTIONS":
        await handleTransactionEvents(req.body);
        break;
      case "ITEM":
        await handleItemEvents(req.body);
        break;
      default:
        console.log(`[Plaid Webhook] Unhandled webhook type: ${webhookType}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Plaid Webhook] Error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
}

async function handleTransferEvents(body: any) {
  const transferEvents = body.transfer_events || [];

  for (const event of transferEvents) {
    const transferId = event.transfer_id;
    const eventId = event.event_id;
    const eventType = event.event_type;
    const timestamp = event.timestamp;

    const transaction = await prisma.transaction.findFirst({
      where: { plaidTransferId: transferId },
    });

    if (!transaction) {
      console.log(`[Plaid Webhook] Transaction not found for transfer: ${transferId}`);
      continue;
    }

    const existingAudit = Array.isArray(transaction.auditTrail) ? transaction.auditTrail : [];
    const alreadyProcessed = existingAudit.some(
      (entry: any) => entry.plaidEventId === eventId
    );

    if (alreadyProcessed) {
      console.log(`[Plaid Webhook] Event ${eventId} already processed, skipping`);
      continue;
    }

    const wasAlreadyCompleted = transaction.status === "COMPLETED";

    let newStatus = transaction.status;
    let completedAt: Date | null = null;
    let failedAt: Date | null = null;
    let statusMessage: string | null = null;

    switch (eventType) {
      case "pending":
        newStatus = "PROCESSING";
        break;
      case "posted":
      case "settled":
        newStatus = "COMPLETED";
        completedAt = new Date(timestamp);
        break;
      case "failed":
        newStatus = "FAILED";
        failedAt = new Date(timestamp);
        statusMessage = event.failure_reason?.description || "Transfer failed";
        break;
      case "cancelled":
        newStatus = "CANCELLED";
        failedAt = new Date(timestamp);
        statusMessage = "Transfer was cancelled";
        break;
      case "returned":
        newStatus = "FAILED";
        failedAt = new Date(timestamp);
        statusMessage = event.failure_reason?.description || "Transfer returned";
        break;
    }

    const auditEntry = {
      action: `PLAID_EVENT_${eventType.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      plaidEventId: eventId,
      plaidEventType: eventType,
      plaidTimestamp: timestamp,
    };

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        statusMessage,
        completedAt,
        failedAt,
        auditTrail: [...existingAudit, auditEntry],
      },
    });

    if (!wasAlreadyCompleted && newStatus === "COMPLETED" && transaction.fundId) {
      if (transaction.type === "CAPITAL_CALL") {
        await updateFundAggregate(transaction.fundId, transaction.amount, "inbound");
      } else if (transaction.type === "DISTRIBUTION") {
        await updateFundAggregate(transaction.fundId, transaction.amount, "outbound");
      }
    }

    console.log(`[Plaid Webhook] Updated transaction ${transaction.id} to ${newStatus}`);
  }
}

async function handleTransactionEvents(body: any) {
  const itemId = body.item_id;
  const webhookCode = body.webhook_code;

  if (webhookCode === "SYNC_UPDATES_AVAILABLE") {
    const bankLink = await prisma.bankLink.findFirst({
      where: { plaidItemId: itemId },
    });

    if (bankLink) {
      await prisma.bankLink.update({
        where: { id: bankLink.id },
        data: { lastSyncAt: new Date() },
      });
    }
  }
}

async function handleItemEvents(body: any) {
  const itemId = body.item_id;
  const webhookCode = body.webhook_code;

  const bankLink = await prisma.bankLink.findFirst({
    where: { plaidItemId: itemId },
  });

  if (!bankLink) {
    console.log(`[Plaid Webhook] BankLink not found for item: ${itemId}`);
    return;
  }

  if (webhookCode === "ERROR") {
    const errorCode = body.error?.error_code;
    const errorMessage = body.error?.error_message;

    await prisma.bankLink.update({
      where: { id: bankLink.id },
      data: {
        status: "ERROR",
        errorCode,
        errorMessage,
      },
    });
  } else if (webhookCode === "PENDING_EXPIRATION") {
    await prisma.bankLink.update({
      where: { id: bankLink.id },
      data: {
        status: "DISCONNECTED",
        errorMessage: "Access token expiring soon, reconnection required",
      },
    });
  }
}

async function updateFundAggregate(fundId: string, amount: any, direction: "inbound" | "outbound") {
  const aggregate = await prisma.fundAggregate.findUnique({
    where: { fundId },
  });

  if (!aggregate) return;

  const amountDecimal = typeof amount === "object" ? parseFloat(amount.toString()) : amount;

  if (direction === "inbound") {
    await prisma.fundAggregate.update({
      where: { fundId },
      data: {
        totalInbound: { increment: amountDecimal },
      },
    });
  } else {
    await prisma.fundAggregate.update({
      where: { fundId },
      data: {
        totalOutbound: { increment: amountDecimal },
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
