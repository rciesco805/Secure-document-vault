import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const pendingSignatures = await prisma.signatureRecipient.findMany({
      where: {
        email: session.user.email,
        status: { in: ["PENDING", "SENT", "VIEWED"] },
        role: "SIGNER",
        document: {
          status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED"] },
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            sentAt: true,
            expirationDate: true,
            team: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedSignatures = pendingSignatures.map((sig) => ({
      id: sig.id,
      documentId: sig.document.id,
      documentTitle: sig.document.title,
      teamName: sig.document.team.name,
      signingToken: sig.signingToken,
      status: sig.status,
      sentAt: sig.document.sentAt,
      expirationDate: sig.document.expirationDate,
    }));

    return res.status(200).json({
      pendingSignatures: formattedSignatures,
    });
  } catch (error: any) {
    console.error("LP pending signatures error:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}
