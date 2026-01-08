import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import AccessApprovedEmail from "@/components/emails/access-approved";
import { isAdminEmail } from "@/lib/constants/admins";
import { CustomUser } from "@/lib/types";
import { constructLinkUrl } from "@/lib/utils/link-url";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = session.user as CustomUser;
  const userEmail = user.email!.toLowerCase();

  const { id: linkId } = req.query as { id: string };
  const { requestId, action, denyReason } = req.body as {
    requestId: string;
    action: "approve" | "deny";
    denyReason?: string;
  };

  if (!requestId || !action) {
    return res.status(400).json({ message: "Request ID and action are required" });
  }

  try {
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        link: {
          include: {
            dataroom: {
              select: {
                id: true,
                name: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!accessRequest) {
      return res.status(404).json({ message: "Access request not found" });
    }

    if (accessRequest.linkId !== linkId) {
      return res.status(400).json({ message: "Request does not match link" });
    }

    if (!isAdminEmail(userEmail)) {
      const userTeam = await prisma.userTeam.findFirst({
        where: { 
          userId: user.id,
          teamId: accessRequest.teamId,
        },
      });
      if (!userTeam) {
        return res.status(403).json({ message: "You don't have permission to manage this request" });
      }
    }

    if (accessRequest.status !== "PENDING") {
      return res.status(400).json({ 
        message: `Request has already been ${accessRequest.status.toLowerCase()}` 
      });
    }

    if (action === "approve") {
      const link = accessRequest.link;
      
      await prisma.$transaction(async (tx) => {
        await tx.accessRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            reviewedBy: user.id,
            reviewedAt: new Date(),
          },
        });

        const currentLink = await tx.link.findUnique({
          where: { id: linkId },
          select: { allowList: true },
        });

        const updatedAllowList = [...(currentLink?.allowList || [])];
        const normalizedEmail = accessRequest.email.toLowerCase().trim();
        const normalizedAllowList = updatedAllowList.map(e => e.toLowerCase().trim());
        
        if (!normalizedAllowList.includes(normalizedEmail)) {
          updatedAllowList.push(accessRequest.email);
          await tx.link.update({
            where: { id: linkId },
            data: { allowList: updatedAllowList },
          });
        }
      });

      const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;
      const accessUrl = constructLinkUrl({
        id: linkId,
        domainSlug: link.domainSlug,
        slug: link.slug,
      });

      try {
        await sendEmail({
          to: accessRequest.email,
          subject: `Access Approved: ${link.dataroom?.name || "Dataroom"}`,
          react: AccessApprovedEmail({
            recipientName: accessRequest.name,
            dataroomName: link.dataroom?.name || "Dataroom",
            teamName: link.team?.name || "BF Fund",
            accessUrl,
          }),
        });
      } catch (emailError) {
        console.error(`Failed to send access approved email:`, emailError);
      }

      return res.status(200).json({
        message: "Access approved successfully",
        email: accessRequest.email,
      });
    } else if (action === "deny") {
      await prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: "DENIED",
          reviewedBy: user.id,
          reviewedAt: new Date(),
          denyReason: denyReason || null,
        },
      });

      return res.status(200).json({
        message: "Access denied",
        email: accessRequest.email,
      });
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    console.error("Access approval error:", error);
    return res.status(500).json({ message: "Failed to process access request" });
  }
}
