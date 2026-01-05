import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const user = session.user as CustomUser;

    try {
      const userTeams = await prisma.userTeam.findMany({
        where: {
          userId: user.id,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              plan: true,
              createdAt: true,
              enableExcelAdvancedMode: true,
              replicateDataroomFolders: true,
            },
          },
        },
        orderBy: {
          team: {
            createdAt: "asc",
          },
        },
      });

      const teams = userTeams.map((userTeam) => userTeam.team);

      // If no teams, check if user is a viewer-only (added via Quick Add or allowList)
      // Viewer-only users should NOT get an auto-created team
      if (teams.length === 0) {
        const userEmail = user.email?.toLowerCase();
        
        // Check if user is a viewer (has viewer group memberships or is in any link allowList)
        const isViewer = await prisma.viewer.findFirst({
          where: {
            email: { equals: userEmail, mode: "insensitive" },
            groups: { some: {} }
          },
          select: { id: true }
        });
        
        const isInAllowList = !isViewer && userEmail ? await prisma.link.findFirst({
          where: {
            allowList: { has: userEmail },
            deletedAt: null,
            isArchived: false,
          },
          select: { id: true }
        }) : null;
        
        // Only create team for non-viewer users (true admins)
        if (!isViewer && !isInAllowList) {
          const defaultTeamName = user.name
            ? `${user.name}'s Team`
            : "Personal Team";
          const defaultTeam = await prisma.team.create({
            data: {
              name: defaultTeamName,
              users: {
                create: {
                  userId: user.id,
                  role: "ADMIN",
                },
              },
            },
            select: {
              id: true,
              name: true,
              plan: true,
              createdAt: true,
              enableExcelAdvancedMode: true,
              replicateDataroomFolders: true,
            },
          });
          teams.push(defaultTeam);
        }
      }

      return res.status(200).json(teams);
    } catch (error) {
      log({
        message: `Failed to find team for user: _${user.id}_ \n\n ${error}`,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else if (req.method === "POST") {
    // POST /api/teams
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { team } = req.body;

    const user = session.user as CustomUser;

    try {
      const newTeam = await prisma.team.create({
        data: {
          name: team,
          users: {
            create: {
              userId: user.id,
              role: "ADMIN",
            },
          },
        },
        include: {
          users: true,
        },
      });

      return res.status(201).json(newTeam);
    } catch (error) {
      log({
        message: `Failed to create team "${team}" for user: _${user.id}_. \n\n*Error*: \n\n ${error}`,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
