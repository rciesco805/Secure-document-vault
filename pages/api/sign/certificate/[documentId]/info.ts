import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { CustomUser } from "@/lib/types";
import { ratelimit } from "@/lib/redis";
import { generateCertificateId } from "@/lib/signature/completion-certificate";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { documentId, token } = req.query;

  if (!documentId || typeof documentId !== "string") {
    return res.status(400).json({ message: "Document ID required" });
  }

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  const limiter = ratelimit(30, "1 m");
  const { success } = await limiter.limit(`certificate-info:${ipAddress}`);

  if (!success) {
    return res.status(429).json({
      message: "Too many requests. Please try again later.",
    });
  }

  try {
    let hasAccess = false;

    if (token && typeof token === "string") {
      const recipient = await prisma.signatureRecipient.findFirst({
        where: {
          documentId,
          OR: [
            { signingToken: token },
            {
              signatureChecksum: {
                path: ["verificationToken"],
                equals: token,
              },
            },
          ],
        },
      });

      if (recipient) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      const session = await getServerSession(req, res, authOptions);
      const user = session?.user as CustomUser;

      if (user) {
        const team = await prisma.team.findFirst({
          where: {
            users: { some: { userId: user.id } },
            signatureDocuments: { some: { id: documentId } },
          },
        });

        if (team) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const document = await prisma.signatureDocument.findUnique({
      where: { id: documentId },
      include: {
        recipients: true,
        team: {
          select: { name: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.status !== "COMPLETED") {
      return res.status(400).json({
        message: "Certificate only available for completed documents",
      });
    }

    if (!document.completedAt) {
      return res.status(400).json({
        message: "Document completion date not recorded",
      });
    }

    const certificateId = generateCertificateId(document.id, document.completedAt);

    return res.status(200).json({
      documentId: document.id,
      documentTitle: document.title,
      organizationName: document.team.name,
      completedAt: document.completedAt.toISOString(),
      certificateId,
      recipientCount: document.recipients.length,
      verified: true,
    });
  } catch (error) {
    console.error("Certificate info error:", error);
    return res.status(500).json({ message: "Failed to get certificate info" });
  }
}
