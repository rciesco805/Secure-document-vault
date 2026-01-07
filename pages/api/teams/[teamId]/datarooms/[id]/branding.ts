import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const { teamId, id: dataroomId } = req.query as {
    teamId: string;
    id: string;
  };

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        users: {
          some: {
            userId: (session.user as CustomUser).id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!team) {
      return res.status(403).end("Unauthorized to access this team");
    }

    const dataroom = await prisma.dataroom.findUnique({
      where: {
        id: dataroomId,
        teamId: teamId,
      },
    });

    if (!dataroom) {
      return res.status(404).end("Dataroom not found");
    }
  } catch (error) {
    errorhandler(error, res);
  }

  if (req.method === "GET") {
    // GET /api/teams/:teamId/datarooms/:id/branding
    const brand = await prisma.dataroomBrand.findUnique({
      where: {
        dataroomId,
      },
    });

    if (!brand) {
      return res.status(200).json(null);
    }

    return res.status(200).json(brand);
  } else if (req.method === "POST" || req.method === "PUT") {
    // POST/PUT /api/teams/:teamId/datarooms/:id/branding
    // Use upsert to handle both create and update
    const { 
      logo, 
      banner, 
      favicon, 
      brandColor, 
      accentColor, 
      welcomeMessage,
      welcomeScreenEnabled,
      welcomePersonalNote,
      welcomeSuggestedViewing,
      welcomeRecommendedDocs,
    } = req.body as {
      logo?: string;
      banner?: string;
      favicon?: string;
      brandColor?: string;
      accentColor?: string;
      welcomeMessage?: string;
      welcomeScreenEnabled?: boolean;
      welcomePersonalNote?: string;
      welcomeSuggestedViewing?: string;
      welcomeRecommendedDocs?: string[];
    };

    const brand = await prisma.dataroomBrand.upsert({
      where: {
        dataroomId,
      },
      create: {
        logo,
        banner,
        favicon,
        brandColor,
        accentColor,
        welcomeMessage,
        welcomeScreenEnabled: welcomeScreenEnabled ?? false,
        welcomePersonalNote,
        welcomeSuggestedViewing,
        welcomeRecommendedDocs,
        dataroomId,
      },
      update: {
        logo,
        banner,
        favicon,
        brandColor,
        accentColor,
        welcomeMessage,
        ...(welcomeScreenEnabled !== undefined && { welcomeScreenEnabled }),
        ...(welcomePersonalNote !== undefined && { welcomePersonalNote }),
        ...(welcomeSuggestedViewing !== undefined && { welcomeSuggestedViewing }),
        ...(welcomeRecommendedDocs !== undefined && { welcomeRecommendedDocs }),
      },
    });

    return res.status(200).json(brand);
  } else if (req.method === "DELETE") {
    // DELETE /api/teams/:teamId/datarooms/:id/branding
    const brand = await prisma.dataroomBrand.findFirst({
      where: {
        dataroomId,
      },
      select: { id: true, logo: true, banner: true },
    });

    if (brand) {
      // Skip file deletion - Vercel Blob not configured
      console.log("Skipping branding file deletion (Vercel Blob not configured)");
    }

    // delete the branding from database
    await prisma.dataroomBrand.delete({
      where: {
        id: brand?.id,
      },
    });

    return res.status(204).end();
  } else {
    // We only allow GET and DELETE requests
    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
