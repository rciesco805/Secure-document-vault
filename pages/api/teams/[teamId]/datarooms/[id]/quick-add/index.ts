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

    const { emails } = req.body as { emails: string[] };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "No emails provided" });
    }

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

      let quickAddGroup = await prisma.viewerGroup.findFirst({
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

      if (!quickAddGroup) {
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

          return { ...group, links: [link] };
        });
        quickAddGroup = result;
      }

      const normalizedEmails = emails.map((e) => e.trim().toLowerCase());

      const results = await Promise.all(
        normalizedEmails.map(async (email) => {
          let viewer = await prisma.viewer.findFirst({
            where: {
              email: email,
              teamId: teamId,
            },
          });

          if (!viewer) {
            viewer = await prisma.viewer.create({
              data: {
                email: email,
                teamId: teamId,
                dataroomId: dataroomId,
              },
            });
          }

          const existingMembership = await prisma.viewerGroupMembership.findUnique({
            where: {
              viewerId_groupId: {
                viewerId: viewer.id,
                groupId: quickAddGroup!.id,
              },
            },
          });

          if (!existingMembership) {
            await prisma.viewerGroupMembership.create({
              data: {
                viewerId: viewer.id,
                groupId: quickAddGroup!.id,
              },
            });
          }

          if (quickAddGroup!.links && quickAddGroup!.links.length > 0) {
            const link = quickAddGroup!.links[0];
            const currentLink = await prisma.link.findUnique({
              where: { id: link.id },
              select: { allowList: true },
            });
            
            const currentAllowList = currentLink?.allowList || [];
            
            if (!currentAllowList.includes(email)) {
              await prisma.link.update({
                where: { id: link.id },
                data: {
                  allowList: [...currentAllowList, email],
                },
              });
            }
          }

          return { email, viewerId: viewer.id };
        }),
      );

      return res.status(200).json({
        message: `${results.length} users added to Quick Add group`,
        users: results,
        groupId: quickAddGroup!.id,
        linkId: quickAddGroup!.links?.[0]?.id,
      });
    } catch (error) {
      console.error("Quick Add error:", error);
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
