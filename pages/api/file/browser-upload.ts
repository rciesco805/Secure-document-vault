import type { NextApiRequest, NextApiResponse } from "next";

import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname: string) => {
        // Generate a client token for the browser to upload the file

        const session = await getServerSession(req, res, authOptions);
        if (!session) {
          res.status(401).end("Unauthorized");
          throw new Error("Unauthorized");
        }

        const userId = (session.user as CustomUser).id;
        const team = await prisma.team.findFirst({
          where: {
            users: {
              some: {
                userId,
              },
            },
          },
          select: {
            plan: true,
          },
        });

        let maxSize = 30 * 1024 * 1024; // 30 MB
        const stripedTeamPlan = team?.plan.replace("+old", "");
        if (
          stripedTeamPlan &&
          ["business", "datarooms", "datarooms-plus"].includes(stripedTeamPlan)
        ) {
          maxSize = 100 * 1024 * 1024; // 100 MB
        }

        return {
          addRandomSuffix: true,
          allowedContentTypes: [
            // PDF
            "application/pdf",
            // Excel & Spreadsheets
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
            "text/csv",
            "text/tab-separated-values",
            "application/vnd.oasis.opendocument.spreadsheet",
            // Word & Documents
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.oasis.opendocument.text",
            "application/rtf",
            "text/rtf",
            "text/plain",
            // PowerPoint & Presentations
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.oasis.opendocument.presentation",
            "application/vnd.apple.keynote",
            "application/x-iwork-keynote-sffkey",
            // Images
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "image/vnd.dwg",
            "image/vnd.dxf",
            // Video
            "video/mp4",
            "video/quicktime",
            "video/x-msvideo",
            "video/webm",
            "video/ogg",
            // Audio
            "audio/mp4",
            "audio/x-m4a",
            "audio/m4a",
            "audio/mpeg",
            // Archives
            "application/zip",
            "application/x-zip-compressed",
            // Other formats
            "application/vnd.google-earth.kml+xml",
            "application/vnd.google-earth.kmz",
            "application/vnd.ms-outlook",
          ],
          maximumSizeInBytes: maxSize,
          metadata: JSON.stringify({
            // optional, sent to your server on upload completion
            userId: (session.user as CustomUser).id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of browser upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        try {
          // Run any logic after the file upload completed
          // const { userId } = JSON.parse(tokenPayload);
          // await db.update({ avatar: blob.url, userId });
        } catch (error) {
          // throw new Error("Could not update user");
        }
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    // The webhook will retry 5 times waiting for a 200
    return res.status(400).json({ error: (error as Error).message });
  }
}
