import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/resend";
import CompletionNotification from "@/components/emails/completion-notification";
import { logAuditEventFromRequest } from "@/lib/audit/audit-logger";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.SIGNATURE_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn("[SIGNATURE_WEBHOOK] No secret configured - accepting in development only");
    return process.env.NODE_ENV === "development";
  }

  if (!signature) {
    console.error("[SIGNATURE_WEBHOOK] Missing x-signature header");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
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

  let body: any;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["x-signature"] as string | undefined;

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("[SIGNATURE_WEBHOOK] Invalid or missing signature");
      return res.status(401).json({ message: "Invalid signature" });
    }

    body = JSON.parse(rawBody.toString());
  } catch (error) {
    console.error("[SIGNATURE_WEBHOOK] Failed to parse body:", error);
    return res.status(400).json({ message: "Invalid request body" });
  }

  try {
    const { event, documentId, recipientId, reason } = body;

    console.log("[SIGNATURE_WEBHOOK] Received event:", { event, documentId, recipientId });

    switch (event) {
      case "document.signed":
        await handleDocumentSigned(req, documentId, recipientId);
        break;

      case "document.completed":
        await handleDocumentCompleted(req, documentId);
        break;

      case "document.viewed":
        await handleDocumentViewed(req, documentId, recipientId);
        break;

      case "document.declined":
        await handleDocumentDeclined(req, documentId, recipientId, reason);
        break;

      default:
        console.log("[SIGNATURE_WEBHOOK] Unknown event:", event);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("[SIGNATURE_WEBHOOK] Error:", error);
    return res.status(500).json({ message: error.message || "Webhook processing failed" });
  }
}

async function handleDocumentSigned(req: NextApiRequest, documentId: string, recipientId: string) {
  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    include: {
      recipients: true,
      team: true,
    },
  });

  if (!document) {
    console.error("[SIGNATURE_WEBHOOK] Document not found:", documentId);
    return;
  }

  const recipient = document.recipients.find((r) => r.id === recipientId);

  await logAuditEventFromRequest(req, {
    eventType: "DOCUMENT_SIGNED",
    teamId: document.teamId,
    resourceType: "SignatureDocument",
    resourceId: documentId,
    metadata: {
      recipientId,
      recipientEmail: recipient?.email,
      recipientName: recipient?.name,
      documentTitle: document.title,
      documentType: document.documentType,
      timestamp: new Date().toISOString(),
    },
  });

  const investor = document.investorId 
    ? await prisma.investor.findUnique({
        where: { id: document.investorId },
        include: { user: true },
      })
    : null;

  const allSigned = document.recipients.every((r) => r.status === "SIGNED");

  if (allSigned && document.status !== "COMPLETED") {
    await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    if (document.documentType === "SUBSCRIPTION" && investor) {
      const subscription = await prisma.subscription.findFirst({
        where: { signatureDocumentId: documentId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "SIGNED" },
        });

        console.log("[SIGNATURE_WEBHOOK] Subscription marked as signed:", subscription.id);
      }
    }

    await sendCompletionNotification(document, investor);

    console.log("[SIGNATURE_WEBHOOK] Document completed:", documentId);
  }
}

async function handleDocumentCompleted(req: NextApiRequest, documentId: string) {
  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    include: {
      team: true,
      recipients: true,
    },
  });

  if (!document) return;

  await logAuditEventFromRequest(req, {
    eventType: "DOCUMENT_COMPLETED",
    teamId: document.teamId,
    resourceType: "SignatureDocument",
    resourceId: documentId,
    metadata: {
      documentTitle: document.title,
      documentType: document.documentType,
      recipientCount: document.recipients.length,
      completedAt: new Date().toISOString(),
    },
  });

  const investor = document.investorId 
    ? await prisma.investor.findUnique({
        where: { id: document.investorId },
        include: { user: true },
      })
    : null;

  if (document.status !== "COMPLETED") {
    await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  if (document.documentType === "SUBSCRIPTION") {
    const subscription = await prisma.subscription.findFirst({
      where: { signatureDocumentId: documentId },
    });

    if (subscription && subscription.status !== "SIGNED") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "SIGNED" },
      });

      console.log("[SIGNATURE_WEBHOOK] Subscription marked as signed via document.completed:", subscription.id);
    }
  }

  await sendCompletionNotification(document, investor);
}

async function handleDocumentViewed(req: NextApiRequest, documentId: string, recipientId: string) {
  const recipient = await prisma.signatureRecipient.update({
    where: { id: recipientId },
    data: {
      viewedAt: new Date(),
    },
  });

  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { teamId: true, title: true },
  });

  await logAuditEventFromRequest(req, {
    eventType: "DOCUMENT_VIEWED",
    teamId: document?.teamId,
    resourceType: "SignatureDocument",
    resourceId: documentId,
    metadata: {
      recipientId,
      recipientEmail: recipient?.email,
      documentTitle: document?.title,
      timestamp: new Date().toISOString(),
    },
  });

  console.log("[SIGNATURE_WEBHOOK] Document viewed:", { documentId, recipientId });
}

async function handleDocumentDeclined(req: NextApiRequest, documentId: string, recipientId: string, reason?: string) {
  const recipient = await prisma.signatureRecipient.update({
    where: { id: recipientId },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
      declinedReason: reason,
    },
  });

  const document = await prisma.signatureDocument.update({
    where: { id: documentId },
    data: {
      status: "DECLINED",
    },
    select: { teamId: true, title: true },
  });

  await logAuditEventFromRequest(req, {
    eventType: "DOCUMENT_DECLINED",
    teamId: document?.teamId,
    resourceType: "SignatureDocument",
    resourceId: documentId,
    metadata: {
      recipientId,
      recipientEmail: recipient?.email,
      declinedReason: reason,
      documentTitle: document?.title,
      timestamp: new Date().toISOString(),
    },
  });

  console.log("[SIGNATURE_WEBHOOK] Document declined:", { documentId, recipientId, reason });
}

async function sendCompletionNotification(document: any, investor: any) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dataroom.bermudafranchisegroup.com";
  const certificateUrl = `${baseUrl}/sign/certificate/${document.id}`;

  const recipients: string[] = [];
  
  if (investor?.user?.email) {
    recipients.push(investor.user.email);
  }

  if (document.team) {
    const teamAdmins = await prisma.userTeam.findMany({
      where: {
        teamId: document.team.id,
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
      },
      include: {
        user: true,
      },
    });

    teamAdmins.forEach((admin) => {
      if (admin.user.email) {
        recipients.push(admin.user.email);
      }
    });
  }

  for (const email of [...new Set(recipients)]) {
    try {
      await sendEmail({
        to: email,
        from: "BF Fund Portal <dataroom@investors.bermudafranchisegroup.com>",
        subject: `Document Signed: ${document.title}`,
        react: CompletionNotification({
          documentTitle: document.title,
          certificateUrl,
        }),
      });

      console.log("[SIGNATURE_WEBHOOK] Notification sent to:", email);
    } catch (error) {
      console.error("[SIGNATURE_WEBHOOK] Failed to send notification to:", email, error);
    }
  }
}
