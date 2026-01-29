import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const ALLOWED_IPS = new Set([
  "127.0.0.1",
  "::1",
  "localhost",
]);

interface WebhookPayload {
  event: string;
  investorId: string;
  fundId?: string;
  data: Record<string, any>;
  timestamp: string;
}

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined
): boolean {
  if (!signature || !WEBHOOK_SECRET) return false;
  
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

function isAllowedSource(req: NextApiRequest): boolean {
  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = typeof forwardedFor === "string" 
    ? forwardedFor.split(",")[0].trim()
    : req.socket.remoteAddress || "";
  
  return ALLOWED_IPS.has(clientIp);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const signature = req.headers["x-webhook-signature"] as string;
    
    const rawBody = await getRawBody(req);
    const parsedBody: WebhookPayload = JSON.parse(rawBody.toString());
    
    if (WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.warn("Webhook signature verification failed");
        return res.status(401).json({ message: "Invalid signature" });
      }
    } else if (!isAllowedSource(req)) {
      console.warn("Webhook from unauthorized source without signature");
      return res.status(401).json({ message: "Unauthorized source" });
    }
    
    const { event, investorId, fundId, data, timestamp } = parsedBody;

    if (!event || !investorId) {
      return res.status(400).json({ message: "Missing required fields: event, investorId" });
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }

    const auditEntry = {
      event,
      timestamp: timestamp || new Date().toISOString(),
      fundId,
      data,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    };

    switch (event) {
      case "capital_call.created":
      case "capital_call.updated":
      case "capital_call.reminder":
        await handleCapitalCallEvent(investorId, fundId, data, auditEntry);
        break;

      case "distribution.created":
      case "distribution.completed":
        await handleDistributionEvent(investorId, fundId, data, auditEntry);
        break;

      case "document.ready":
      case "document.signed":
        await handleDocumentEvent(investorId, data, auditEntry);
        break;

      case "kyc.status_changed":
        await handleKycEvent(investorId, data, auditEntry);
        break;

      case "transaction.status_changed":
        await handleTransactionEvent(investorId, data, auditEntry);
        break;

      case "fund.threshold_met":
        await handleThresholdEvent(investorId, fundId, data, auditEntry);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return res.status(200).json({ 
      success: true, 
      event,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function handleCapitalCallEvent(
  investorId: string,
  fundId: string | undefined,
  data: Record<string, any>,
  auditEntry: Record<string, any>
) {
  if (data.capitalCallId) {
    await prisma.capitalCallResponse.updateMany({
      where: {
        investorId,
        capitalCallId: data.capitalCallId,
      },
      data: {
        status: data.status || "PENDING",
        updatedAt: new Date(),
      },
    });
  }
}

async function handleDistributionEvent(
  investorId: string,
  fundId: string | undefined,
  data: Record<string, any>,
  auditEntry: Record<string, any>
) {
  if (data.distributionId && data.amount) {
    await prisma.transaction.create({
      data: {
        investorId,
        type: "DISTRIBUTION",
        amount: data.amount,
        distributionId: data.distributionId,
        fundId,
        status: data.status || "PENDING",
        description: data.description || `Distribution #${data.distributionNumber || ""}`,
        auditTrail: [auditEntry],
      },
    });
  }
}

async function handleDocumentEvent(
  investorId: string,
  data: Record<string, any>,
  auditEntry: Record<string, any>
) {
  console.log(`Document event for investor ${investorId}:`, data);
}

async function handleKycEvent(
  investorId: string,
  data: Record<string, any>,
  auditEntry: Record<string, any>
) {
  if (data.status) {
    await prisma.$executeRaw`
      UPDATE "Investor"
      SET "personaStatus" = ${data.status},
          "personaVerifiedAt" = ${data.status === "APPROVED" ? new Date() : null}
      WHERE id = ${investorId}
    `;
  }
}

async function handleTransactionEvent(
  investorId: string,
  data: Record<string, any>,
  auditEntry: Record<string, any>
) {
  if (data.transactionId && data.status) {
    await prisma.transaction.update({
      where: { id: data.transactionId },
      data: {
        status: data.status,
        statusMessage: data.statusMessage,
        processedAt: data.status === "PROCESSING" ? new Date() : undefined,
        completedAt: data.status === "COMPLETED" ? new Date() : undefined,
        failedAt: data.status === "FAILED" ? new Date() : undefined,
      },
    });
  }
}

async function handleThresholdEvent(
  investorId: string,
  fundId: string | undefined,
  data: Record<string, any>,
  auditEntry: Record<string, any>
) {
  console.log(`Threshold event for fund ${fundId}:`, data);
}
