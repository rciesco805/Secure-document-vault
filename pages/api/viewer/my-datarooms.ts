import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const user = session.user as CustomUser;
    const userEmail = user.email?.toLowerCase();

    if (!userEmail) {
      return res.status(400).json({ error: "No email found" });
    }

    try {
      const accessibleDatarooms: {
        id: string;
        name: string;
        linkId: string;
        teamName: string;
      }[] = [];

      const viewer = await prisma.viewer.findFirst({
        where: {
          email: { equals: userEmail, mode: "insensitive" },
        },
        include: {
          groups: {
            include: {
              group: {
                include: {
                  links: {
                    where: {
                      deletedAt: null,
                      isArchived: false,
                    },
                    include: {
                      dataroom: {
                        select: {
                          id: true,
                          name: true,
                          team: {
                            select: {
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (viewer) {
        for (const membership of viewer.groups) {
          for (const link of membership.group.links) {
            if (link.dataroom) {
              accessibleDatarooms.push({
                id: link.dataroom.id,
                name: link.dataroom.name,
                linkId: link.id,
                teamName: link.dataroom.team.name,
              });
            }
          }
        }
      }

      const linksWithEmail = await prisma.link.findMany({
        where: {
          allowList: { has: userEmail },
          deletedAt: null,
          isArchived: false,
          dataroomId: { not: null },
        },
        include: {
          dataroom: {
            select: {
              id: true,
              name: true,
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      for (const link of linksWithEmail) {
        if (link.dataroom && !accessibleDatarooms.find((d) => d.id === link.dataroom!.id)) {
          accessibleDatarooms.push({
            id: link.dataroom.id,
            name: link.dataroom.name,
            linkId: link.id,
            teamName: link.dataroom.team.name,
          });
        }
      }

      return res.status(200).json({
        datarooms: accessibleDatarooms,
        viewerEmail: userEmail,
      });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
