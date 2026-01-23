import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getFile } from "@/lib/files/get-file";
import { DocumentStorageType } from "@prisma/client";

export const config = {
  api: {
    responseLimit: false,
  },
};

interface BlobManifest {
  exportedAt: string;
  exportedBy: string;
  teamId: string;
  blobs: {
    storageKey: string;
    documentType: string;
    investorId: string;
    title: string;
    signedUrl?: string;
    error?: string;
  }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { teamId, includeSignedUrls } = req.method === "GET" ? req.query : req.body;

    if (!teamId || typeof teamId !== "string") {
      return res.status(400).json({ message: "Team ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { teamId },
          include: { team: true },
        },
      },
    });

    if (!user?.teams?.[0]) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    const userRole = user.teams[0].role;
    if (!["ADMIN", "OWNER"].includes(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const funds = await prisma.fund.findMany({
      where: { teamId },
      select: { id: true },
    });
    const fundIds = funds.map((f) => f.id);

    const investments = await prisma.investment.findMany({
      where: { fundId: { in: fundIds } },
      select: { investorId: true },
    });
    const investorIds = [...new Set(investments.map((i) => i.investorId))];

    const documents = await prisma.investorDocument.findMany({
      where: { investorId: { in: investorIds } },
      select: {
        storageKey: true,
        documentType: true,
        investorId: true,
        title: true,
      },
    });

    const manifest: BlobManifest = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email,
      teamId,
      blobs: [],
    };

    for (const doc of documents) {
      const blobEntry: BlobManifest["blobs"][0] = {
        storageKey: doc.storageKey,
        documentType: doc.documentType,
        investorId: doc.investorId,
        title: doc.title,
      };

      if (includeSignedUrls === "true" || includeSignedUrls === true) {
        try {
          const signedUrl = await getFile({
            type: DocumentStorageType.S3_PATH,
            data: doc.storageKey,
          });
          blobEntry.signedUrl = signedUrl;
        } catch (err: any) {
          blobEntry.error = err.message;
        }
      }

      manifest.blobs.push(blobEntry);
    }

    await prisma.auditLog.create({
      data: {
        eventType: "BLOB_EXPORT",
        userId: user.id,
        teamId,
        resourceType: "TEAM_BLOBS",
        resourceId: teamId,
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
        metadata: {
          blobCount: manifest.blobs.length,
          includeSignedUrls: includeSignedUrls === "true" || includeSignedUrls === true,
        },
      },
    }).catch(() => {});

    return res.status(200).json(manifest);
  } catch (error: any) {
    console.error("Blob export error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
