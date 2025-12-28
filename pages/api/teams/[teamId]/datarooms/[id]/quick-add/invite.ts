import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { sendDataroomViewerInvite } from "@/ee/features/dataroom-invitations/emails/lib/send-dataroom-viewer-invite";
import { createVisitorMagicLink, INVITATION_MAGIC_LINK_EXPIRY_MINUTES } from "@/lib/auth/create-visitor-magic-link";
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

      const quickAddGroup = await prisma.viewerGroup.findFirst({
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
            select: {
              id: true,
              domainId: true,
              domainSlug: true,
              slug: true,
            },
            take: 1,
          },
        },
      });

      if (!quickAddGroup || !quickAddGroup.links || quickAddGroup.links.length === 0) {
        return res.status(404).json({ message: "Quick Add group or link not found" });
      }

      const link = quickAddGroup.links[0];
      const senderUser = session.user as CustomUser;
      const senderEmail = senderUser.email || "investors@bermudafranchisegroup.com";
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://dataroom.bermudafranchisegroup.com";
      
      const normalizedEmails = emails.map((e) => e.trim().toLowerCase());

      const results = await Promise.all(
        normalizedEmails.map(async (email) => {
          try {
            const viewer = await prisma.viewer.findFirst({
              where: {
                email: email,
                teamId: teamId,
              },
            });

            if (viewer) {
              await prisma.viewerInvitation.create({
                data: {
                  viewerId: viewer.id,
                  linkId: link.id,
                  groupId: quickAddGroup.id,
                  invitedBy: senderEmail,
                  status: "SENT",
                },
              });
            }

            // Create a pre-authenticated magic link with 1-hour expiration
            const magicLinkResult = await createVisitorMagicLink({
              email: email,
              linkId: link.id,
              isDataroom: true,
              baseUrl: baseUrl,
              expiryMinutes: INVITATION_MAGIC_LINK_EXPIRY_MINUTES,
            });

            const invitationUrl = magicLinkResult?.magicLink || `${baseUrl}/view/${link.id}`;

            await sendDataroomViewerInvite({
              dataroomName: dataroom.name,
              senderEmail: senderEmail,
              to: email,
              url: invitationUrl,
            });

            return { email, sent: true };
          } catch (error) {
            console.error(`Failed to send invite to ${email}:`, error);
            return { email, sent: false, error: String(error) };
          }
        }),
      );

      const successful = results.filter((r) => r.sent).length;
      const failed = results.filter((r) => !r.sent).length;

      return res.status(200).json({
        message: `${successful} invitation${successful !== 1 ? "s" : ""} sent${failed > 0 ? `, ${failed} failed` : ""}`,
        results,
      });
    } catch (error) {
      console.error("Quick Add invite error:", error);
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
