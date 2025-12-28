import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const userId = (session.user as CustomUser).id;
    const { teamId, id: dataroomId } = req.query as {
      teamId: string;
      id: string;
    };

    try {
      const teamAccess = await prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId: userId,
            teamId: teamId,
          },
        },
      });

      if (!teamAccess) {
        return res.status(401).end("Unauthorized");
      }

      const dataroom = await prisma.dataroom.findUnique({
        where: {
          id: dataroomId,
          teamId: teamId,
        },
      });

      if (!dataroom) {
        return res.status(404).json({ message: "Dataroom not found" });
      }

      const existingQuickAdd = await prisma.viewerGroup.findFirst({
        where: {
          dataroomId: dataroomId,
          isQuickAdd: true,
        },
        include: {
          links: {
            where: {
              deletedAt: null,
              isArchived: false,
            },
            take: 1,
          },
        },
      });

      if (existingQuickAdd) {
        return res.status(200).json({
          message: "Quick Add group already exists",
          group: existingQuickAdd,
          linkId: existingQuickAdd.links?.[0]?.id,
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.viewerGroup.create({
          data: {
            name: "Quick Add",
            dataroomId: dataroomId,
            teamId: teamId,
            isQuickAdd: true,
            allowAll: true,
          },
        });

        const link = await tx.link.create({
          data: {
            name: "Quick Add Link",
            linkType: "DATAROOM_LINK",
            dataroomId: dataroomId,
            groupId: group.id,
            audienceType: "GROUP",
            teamId: teamId,
            emailProtected: true,
            emailAuthenticated: false,
            allowDownload: false,
            enableNotification: true,
          },
        });

        return { group, link };
      });

      return res.status(201).json({
        message: "Quick Add group created",
        group: result.group,
        linkId: result.link.id,
      });
    } catch (error) {
      console.error("Ensure Quick Add error:", error);
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
