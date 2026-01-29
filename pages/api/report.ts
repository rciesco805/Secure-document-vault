import type { NextApiRequest, NextApiResponse } from "next";

import { waitUntil } from "@vercel/functions";
import { z } from "zod";

import AbuseReportEmail from "@/components/emails/abuse-report";
import { getAllAdminEmails } from "@/lib/constants/admins";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendEmail } from "@/lib/resend";

const bodyValidation = z.object({
  linkId: z.string(),
  documentId: z.string(),
  viewId: z.string(),
  abuseType: z.number().int().min(1).max(6),
});


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // We only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { linkId, documentId, viewId, abuseType } = req.body as {
    linkId: string;
    documentId: string;
    viewId: string;
    abuseType: number;
  };
  const result = bodyValidation.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Invalid request" });
  }

  let documentInfo: {
    name: string;
    teamId: string;
  } | null = null;
  let viewerEmail: string | null = null;
  let dataroomName: string | null = null;

  try {
    const view = await prisma.view.findUnique({
      where: {
        id: viewId,
        linkId,
        documentId,
      },
      select: { 
        id: true,
        viewerEmail: true,
        dataroomId: true,
      },
    });

    if (!view) {
      return res.status(400).json({
        status: "error",
        message: "View not found",
      });
    }

    viewerEmail = view.viewerEmail;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        name: true,
        teamId: true,
      },
    });

    documentInfo = document;

    if (view.dataroomId) {
      const dataroom = await prisma.dataroom.findUnique({
        where: { id: view.dataroomId },
        select: { name: true },
      });
      dataroomName = dataroom?.name || null;
    }
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: (err as Error).message,
    });
  }

  try {
    // Create a unique Redis key to track reports for the documentId
    const reportKey = `report:doc_${documentId}`;
    const viewIdValue = `view_${viewId}`;

    // Check if the viewId has already reported for this documentId (if Redis available)
    if (redis) {
      const hasReported = await redis.sismember(reportKey, viewIdValue);
      if (hasReported) {
        return res.status(400).json({
          status: "error",
          message: "You have already reported this document",
        });
      }

      // Perform all non-dependent Redis operations in parallel
      waitUntil(
        Promise.all([
          // Add the viewId to the Redis set for this documentId
          redis.sadd(reportKey, viewIdValue),

          // Increment the report count for the documentId
          redis.hincrby("reportCount", `doc_${documentId}`, 1),

          // Store the abuse type report under a Redis hash for future analysis
          redis.hset(`report:doc_${documentId}:details`, {
            [viewIdValue]: abuseType, // Store the abuseType as a number for this viewId
          }),
        ]),
      );
    }

    // Send email notification to authorized admins (dynamic lookup)
    const adminEmails = await getAllAdminEmails();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dataroom.bermudafranchisegroup.com";
    const documentUrl = documentInfo?.teamId 
      ? `${baseUrl}/documents?teamId=${documentInfo.teamId}`
      : baseUrl;

    waitUntil(
      Promise.all(
        adminEmails.map((email) =>
          sendEmail({
            to: email,
            subject: `Abuse Report: ${documentInfo?.name || "Unknown Document"}`,
            react: AbuseReportEmail({
              documentName: documentInfo?.name || "Unknown Document",
              dataroomName: dataroomName || undefined,
              abuseType,
              reporterEmail: viewerEmail || undefined,
              documentUrl,
            }),
            system: true,
          }).catch((err) => {
            console.error(`Failed to send abuse report email to ${email}:`, err);
          })
        )
      )
    );

    return res.status(200).json({
      status: "success",
      message: "Report submitted successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: (err as Error).message,
    });
  }
}
