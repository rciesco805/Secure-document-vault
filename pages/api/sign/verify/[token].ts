import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { verifySignatureChecksum, SignatureChecksum } from "@/lib/signature/checksum";
import { getFile } from "@/lib/files/get-file";
import { ratelimit } from "@/lib/redis";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Verification token required" });
  }

  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] 
    || req.socket?.remoteAddress 
    || "unknown";
  
  const limiter = ratelimit(10, "1 m");
  const { success } = await limiter.limit(`verify:${ipAddress}`);
  
  if (!success) {
    return res.status(429).json({ 
      verified: false,
      message: "Too many verification requests. Please try again later." 
    });
  }

  try {
    const recipient = await prisma.signatureRecipient.findFirst({
      where: {
        signatureChecksum: {
          path: ["verificationToken"],
          equals: token,
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            file: true,
            storageType: true,
            status: true,
            completedAt: true,
            team: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!recipient) {
      return res.status(404).json({ 
        verified: false,
        message: "Signature not found" 
      });
    }

    if (recipient.status !== "SIGNED") {
      return res.status(400).json({
        verified: false,
        message: "Document was not signed by this recipient",
      });
    }

    const checksum = recipient.signatureChecksum as SignatureChecksum | null;
    
    if (!checksum) {
      return res.status(400).json({
        verified: false,
        message: "No checksum available for verification",
      });
    }

    let documentContent: string;
    try {
      const fileUrl = await getFile({ 
        type: recipient.document.storageType, 
        data: recipient.document.file 
      });
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      documentContent = Buffer.from(buffer).toString("base64");
    } catch (error) {
      console.error("Failed to fetch document for verification:", error);
      return res.status(500).json({
        verified: false,
        message: "Failed to retrieve document for verification",
      });
    }
    
    const isValid = verifySignatureChecksum(
      checksum,
      documentContent,
      recipient.id,
      recipient.signedAt!,
      recipient.ipAddress
    );

    const consentRecord = recipient.consentRecord as any;

    return res.status(200).json({
      verified: isValid,
      signature: {
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        signedAt: recipient.signedAt,
        ipAddress: recipient.ipAddress,
        documentTitle: recipient.document.title,
        documentStatus: recipient.document.status,
        organizationName: recipient.document.team.name,
      },
      checksum: {
        documentHash: checksum.documentHash,
        signatureHash: checksum.signatureHash,
        algorithm: checksum.algorithm,
        createdAt: checksum.createdAt,
      },
      consent: consentRecord ? {
        consentedAt: consentRecord.consentedAt,
        consentVersion: consentRecord.consentVersion,
        consentType: consentRecord.consentType,
      } : null,
      compliance: {
        esignAct: true,
        ueta: true,
        auditTrailAvailable: true,
      },
    });
  } catch (error) {
    console.error("Signature verification error:", error);
    return res.status(500).json({ 
      verified: false,
      message: "Verification failed" 
    });
  }
}
