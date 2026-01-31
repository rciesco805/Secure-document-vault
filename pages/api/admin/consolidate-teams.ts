import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  
  // Check if user is an admin of any team
  const isAdmin = session?.user?.email 
    ? await prisma.userTeam.findFirst({
        where: {
          user: { email: { equals: session.user.email, mode: "insensitive" } },
          role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
          status: "ACTIVE",
        },
      })
    : null;
    
  if (!session?.user?.email || !isAdmin) {
    return res.status(401).json({ error: "Unauthorized - admin access required" });
  }

  try {
    // Find investors@ user and their team
    const investorsUser = await prisma.user.findUnique({
      where: { email: "investors@bermudafranchisegroup.com" },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!investorsUser) {
      return res.status(404).json({ error: "investors@ user not found" });
    }

    // Get the primary team (first team or the one with most documents)
    const teamsWithDocCounts = await Promise.all(
      investorsUser.teams.map(async (tu) => {
        const docCount = await prisma.document.count({
          where: { teamId: tu.teamId },
        });
        return { ...tu, docCount };
      }),
    );

    teamsWithDocCounts.sort((a, b) => b.docCount - a.docCount);
    const primaryTeam = teamsWithDocCounts[0]?.team;

    if (!primaryTeam) {
      return res.status(404).json({ error: "No team found for investors@" });
    }

    const results: string[] = [];
    results.push(`Primary team: ${primaryTeam.name} (ID: ${primaryTeam.id})`);

    // Find other admin users (dynamically from database)
    const allAdminMemberships = await prisma.userTeam.findMany({
      where: {
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
        user: {
          email: { not: "investors@bermudafranchisegroup.com" },
        },
      },
      include: {
        user: {
          include: {
            teams: {
              include: {
                team: {
                  include: {
                    documents: true,
                    datarooms: true,
                  },
                },
              },
            },
          },
        },
      },
      distinct: ["userId"],
    });
    
    const otherAdmins = allAdminMemberships.map(m => m.user);

    // For each other admin, move their assets and add them to the primary team
    for (const admin of otherAdmins) {
      results.push(`Processing: ${admin.email}`);

      // Check if already on primary team
      const alreadyOnTeam = admin.teams.some(tu => tu.teamId === primaryTeam.id);
      
      if (!alreadyOnTeam) {
        // Add to primary team as admin
        await prisma.userTeam.create({
          data: {
            userId: admin.id,
            teamId: primaryTeam.id,
            role: "ADMIN",
          },
        });
        results.push(`  - Added to primary team as ADMIN`);
      } else {
        results.push(`  - Already on primary team`);
      }

      // Move documents from their other teams to primary team
      for (const tu of admin.teams) {
        if (tu.teamId === primaryTeam.id) continue;
        
        const oldTeam = tu.team;
        
        // Move documents
        const docsToMove = await prisma.document.updateMany({
          where: { teamId: oldTeam.id },
          data: { teamId: primaryTeam.id },
        });
        if (docsToMove.count > 0) {
          results.push(`  - Moved ${docsToMove.count} documents from "${oldTeam.name}"`);
        }

        // Move datarooms
        const dataroomsToMove = await prisma.dataroom.updateMany({
          where: { teamId: oldTeam.id },
          data: { teamId: primaryTeam.id },
        });
        if (dataroomsToMove.count > 0) {
          results.push(`  - Moved ${dataroomsToMove.count} datarooms from "${oldTeam.name}"`);
        }
      }
    }

    // Remove other team memberships for admin users (keeping only primary team)
    for (const admin of otherAdmins) {
      for (const tu of admin.teams) {
        if (tu.teamId !== primaryTeam.id) {
          await prisma.userTeam.delete({
            where: {
              userId_teamId: {
                userId: admin.id,
                teamId: tu.teamId,
              },
            },
          });
          results.push(`  - Removed ${admin.email} from team "${tu.team.name}"`);
        }
      }
    }

    // Also remove investors@ from any other teams
    for (const tu of investorsUser.teams) {
      if (tu.teamId !== primaryTeam.id) {
        await prisma.userTeam.delete({
          where: {
            userId_teamId: {
              userId: investorsUser.id,
              teamId: tu.teamId,
            },
          },
        });
        results.push(`Removed investors@ from team "${tu.team.name}"`);
      }
    }

    // Delete empty teams (teams with no members)
    const emptyTeams = await prisma.team.findMany({
      where: {
        users: {
          none: {},
        },
      },
    });

    for (const emptyTeam of emptyTeams) {
      // Delete related records first
      await prisma.invitation.deleteMany({ where: { teamId: emptyTeam.id } });
      await prisma.domain.deleteMany({ where: { teamId: emptyTeam.id } });
      await prisma.team.delete({ where: { id: emptyTeam.id } });
      results.push(`Deleted empty team: "${emptyTeam.name}"`);
    }

    // Final verification
    const finalTeamCount = await prisma.team.count();
    const finalAdminCheck = await prisma.userTeam.findMany({
      where: {
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
      include: {
        user: { select: { email: true } },
        team: { select: { name: true } },
      },
    });

    results.push(`\nFinal state:`);
    results.push(`Total teams: ${finalTeamCount}`);
    results.push(`Admin team memberships:`);
    for (const membership of finalAdminCheck) {
      results.push(`  - ${membership.user.email} on "${membership.team.name}" as ${membership.role}`);
    }

    return res.status(200).json({
      success: true,
      message: "Team consolidation complete",
      details: results,
    });
  } catch (error) {
    console.error("Team consolidation error:", error);
    return res.status(500).json({
      error: "Consolidation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
