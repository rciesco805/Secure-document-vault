import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import AccessRequestNotificationEmail from "@/components/emails/access-request-notification";
import { ADMIN_EMAILS } from "@/lib/constants/admins";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id: linkId } = req.query as { id: string };
  const { email, name, message } = req.body as {
    email: string;
    name?: string;
    message?: string;
  };

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        dataroom: {
          select: {
            id: true,
            name: true,
            teamId: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        group: {
          select: {
            id: true,
            members: {
              include: {
                viewer: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      return res.status(404).json({ message: "Link not found" });
    }

    if (!link.teamId || !link.team) {
      return res.status(400).json({ message: "Invalid link configuration" });
    }

    const normalizedAllowList = (link.allowList || []).map((e: string) => e.toLowerCase().trim());
    if (normalizedAllowList.includes(normalizedEmail)) {
      return res.status(200).json({
        message: "You already have access to this dataroom. Please enter your email to continue.",
        status: "HAS_ACCESS",
        hasAccess: true,
      });
    }

    if (link.group?.members) {
      const isGroupMember = link.group.members.some(
        (m) => m.viewer.email.toLowerCase().trim() === normalizedEmail
      );
      if (isGroupMember) {
        return res.status(200).json({
          message: "You already have access to this dataroom. Please enter your email to continue.",
          status: "HAS_ACCESS",
          hasAccess: true,
        });
      }
    }

    const existingRequest = await prisma.accessRequest.findUnique({
      where: {
        linkId_email: {
          linkId,
          email: normalizedEmail,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return res.status(200).json({ 
          message: "Your access request is pending review. You will receive an email once approved.",
          status: "PENDING"
        });
      }
      if (existingRequest.status === "APPROVED") {
        return res.status(200).json({ 
          message: "Your access has been approved. Please enter your email to continue.",
          status: "APPROVED",
          hasAccess: true,
        });
      }
      if (existingRequest.status === "DENIED") {
        return res.status(403).json({ 
          message: "Your access request was previously denied.",
          status: "DENIED"
        });
      }
    }

    const accessRequest = await prisma.accessRequest.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        message: message || null,
        linkId,
        dataroomId: link.dataroomId,
        teamId: link.teamId,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;
    const dataroomPath = link.dataroomId ? `/datarooms/${link.dataroomId}` : "/datarooms";
    const approvalUrl = `${baseUrl}${dataroomPath}?accessRequest=${accessRequest.id}&linkId=${linkId}`;

    const adminEmails = [...ADMIN_EMAILS];

    for (const adminEmail of adminEmails) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `Access Request: ${link.dataroom?.name || "Dataroom"}`,
          react: AccessRequestNotificationEmail({
            requesterEmail: normalizedEmail,
            requesterName: name,
            requesterMessage: message,
            dataroomName: link.dataroom?.name || "Dataroom",
            teamName: link.team.name,
            approvalUrl,
          }),
        });
      } catch (emailError) {
        console.error(`Failed to send access request notification to ${adminEmail}:`, emailError);
      }
    }

    return res.status(200).json({
      message: "Access request submitted successfully. You will receive an email once approved.",
      status: "PENDING",
      requestId: accessRequest.id,
    });
  } catch (error) {
    console.error("Access request error:", error);
    return res.status(500).json({ message: "Failed to submit access request" });
  }
}
