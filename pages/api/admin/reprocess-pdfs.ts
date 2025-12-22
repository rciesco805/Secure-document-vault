import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

import prisma from "@/lib/prisma";

const ADMIN_EMAILS = [
  "rciesco@gmail.com",
  "richard@bermudafranchisegroup.com",
  "investors@bermudafranchisegroup.com",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const stuckPdfs = await prisma.documentVersion.findMany({
      where: {
        type: "pdf",
        numPages: null,
      },
      select: {
        id: true,
        file: true,
        document: {
          select: {
            id: true,
            name: true,
            teamId: true,
          },
        },
      },
      take: 50,
    });

    const results: { name: string; status: string; error?: string }[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;

    for (const version of stuckPdfs) {
      if (!version.document) continue;

      try {
        const response = await fetch(`${baseUrl}/api/mupdf/process-pdf-local`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          },
          body: JSON.stringify({
            documentVersionId: version.id,
            teamId: version.document.teamId,
          }),
        });

        if (response.ok) {
          results.push({
            name: version.document.name,
            status: "success",
          });
        } else {
          const error = await response.json().catch(() => ({ error: "Unknown error" }));
          results.push({
            name: version.document.name,
            status: "failed",
            error: error.error || error.details || "Processing failed",
          });
        }
      } catch (error) {
        results.push({
          name: version.document.name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(200).json({
      message: `Processed ${results.length} PDFs`,
      totalStuck: stuckPdfs.length,
      results,
    });
  } catch (error) {
    console.error("Reprocess PDFs error:", error);
    return res.status(500).json({
      error: "Failed to reprocess PDFs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
