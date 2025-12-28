import { Link } from "@prisma/client";

import prisma from "@/lib/prisma";

import { sendBlockedEmailAttemptNotification } from "./send-blocked-email-attempt";

export async function reportDeniedAccessAttempt(
  link: Partial<Link>,
  email: string,
  accessType: "global" | "allow" | "deny" = "global",
) {
  if (!link || !link.teamId) return;
  
  // Ensure email is present - use placeholder if empty
  const blockedEmail = email && email.trim() ? email.trim() : "(no email provided)";

  // Check if the blocked email belongs to a team member - don't send notifications for team members
  if (blockedEmail !== "(no email provided)") {
    const teamMember = await prisma.userTeam.findFirst({
      where: {
        teamId: link.teamId,
        status: "ACTIVE",
        user: {
          email: {
            equals: blockedEmail,
            mode: "insensitive",
          },
        },
      },
    });
    
    if (teamMember) {
      // Skip sending blocked notification for team members
      return;
    }
  }

  // Get all admin and manager emails
  const users = await prisma.userTeam.findMany({
    where: {
      role: { in: ["ADMIN", "MANAGER"] },
      status: "ACTIVE",
      teamId: link.teamId,
    },
    select: {
      user: { select: { email: true } },
    },
  });

  const adminManagerEmails = users
    .map((u) => u.user?.email)
    .filter((e): e is string => !!e);

  // Get resource info and owner email
  let resourceType: "dataroom" | "document" = "dataroom";
  let resourceName = "Dataroom";
  let ownerEmail: string | undefined;

  if (link.documentId) {
    resourceType = "document";
    const document = await prisma.document.findUnique({
      where: { id: link.documentId },
      select: { name: true, ownerId: true },
    });
    resourceName = document?.name || "Document";

    if (document?.ownerId) {
      const owner = await prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId: document.ownerId,
            teamId: link.teamId,
          },
          status: "ACTIVE",
        },
        select: { user: { select: { email: true } } },
      });
      ownerEmail = owner?.user?.email || undefined;
    }
  } else if (link.dataroomId) {
    const dataroom = await prisma.dataroom.findUnique({
      where: { id: link.dataroomId },
      select: { name: true },
    });
    resourceName = dataroom?.name || "Dataroom";
  }

  // Combine all recipients and remove duplicates
  const allRecipients = [...adminManagerEmails];
  if (ownerEmail && !allRecipients.includes(ownerEmail)) {
    allRecipients.push(ownerEmail);
  }

  // Send email to all recipients
  if (allRecipients.length > 0) {
    const [to, ...cc] = allRecipients;
    
    // Build admin URL for direct access to link permissions
    let adminUrl: string | undefined;
    if (accessType === "allow" && link.id) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
      if (link.dataroomId) {
        adminUrl = `${baseUrl}/datarooms/${link.dataroomId}?linkId=${link.id}&tab=links`;
      } else if (link.documentId) {
        adminUrl = `${baseUrl}/documents/${link.documentId}?linkId=${link.id}`;
      }
    }
    
    await sendBlockedEmailAttemptNotification({
      to,
      cc: cc.length > 0 ? cc : undefined,
      blockedEmail,
      linkName: link.name || `Link #${link.id?.slice(-5)}`,
      resourceName,
      resourceType,
      timestamp: new Date().toLocaleString(),
      accessType,
      adminUrl,
    });
  }
}
