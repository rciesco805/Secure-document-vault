import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { getFile } from "@/lib/files/get-file";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        investorProfile: {
          include: {
            documents: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      user.investorProfile.documents.map(async (doc) => {
        let fileUrl = null;
        try {
          fileUrl = await getFile({
            type: doc.storageType as any,
            data: doc.storageKey,
          });
        } catch (err) {
          console.error("Error getting file URL:", err);
        }
        return {
          id: doc.id,
          title: doc.title,
          documentType: doc.documentType,
          fileUrl,
          signedAt: doc.signedAt,
          createdAt: doc.createdAt,
        };
      })
    );

    return res.status(200).json({
      documents: documentsWithUrls,
    });
  } catch (error: any) {
    console.error("LP docs fetch error:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}
