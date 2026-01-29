import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { ratelimit } from "@/lib/redis";
import { generateCertificateId } from "@/lib/signature/completion-certificate";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      verified: false,
      message: "Certificate ID required",
    });
  }

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  const limiter = ratelimit(20, "1 m");
  const { success } = await limiter.limit(`certificate-verify:${ipAddress}`);

  if (!success) {
    return res.status(429).json({
      verified: false,
      message: "Too many requests. Please try again later.",
    });
  }

  try {
    const completedDocuments = await prisma.signatureDocument.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { not: null },
      },
      include: {
        recipients: true,
        team: {
          select: { name: true },
        },
      },
    });

    for (const doc of completedDocuments) {
      if (!doc.completedAt) continue;

      const certificateId = generateCertificateId(doc.id, doc.completedAt);

      if (certificateId === id.toUpperCase()) {
        return res.status(200).json({
          verified: true,
          document: {
            id: doc.id,
            title: doc.title,
            organizationName: doc.team.name,
            completedAt: doc.completedAt.toISOString(),
            recipientCount: doc.recipients.length,
          },
          certificate: {
            certificateId,
            generatedAt: doc.completedAt.toISOString(),
          },
        });
      }
    }

    return res.status(200).json({
      verified: false,
      message: "Certificate not found. Please check the ID and try again.",
    });
  } catch (error) {
    console.error("Certificate verification error:", error);
    return res.status(500).json({
      verified: false,
      message: "Verification failed. Please try again later.",
    });
  }
}
