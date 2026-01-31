import { sendEmail } from "@/lib/resend";
import prisma from "@/lib/prisma";

import WelcomeEmail from "@/components/emails/welcome";
import ViewerWelcomeEmail from "@/components/emails/viewer-welcome";

import { CreateUserEmailProps } from "../types";

export const sendWelcomeEmail = async (params: CreateUserEmailProps) => {
  const { name, email } = params.user;
  
  if (!email) return;
  
  const emailLower = email.toLowerCase().trim();
  
  // Check if user is an admin of any team (dynamic lookup)
  const adminTeam = await prisma.userTeam.findFirst({
    where: {
      user: { email: { equals: emailLower, mode: "insensitive" } },
      role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
  });
  
  const isAdmin = !!adminTeam;
  
  if (isAdmin) {
    const emailTemplate = WelcomeEmail({ name });
    try {
      await sendEmail({
        to: email as string,
        from: "BF Fund <dataroom@investors.bermudafranchisegroup.com>",
        subject: "Welcome to BF Fund Dataroom!",
        react: emailTemplate,
        test: process.env.NODE_ENV === "development",
      });
    } catch (e) {
      console.error(e);
    }
    return;
  }
  
  // Check if user was already pre-approved (has a Viewer record with group membership)
  // If so, they already received an invite email when added - don't send duplicate "Access granted"
  const viewer = await prisma.viewer.findFirst({
    where: {
      email: { equals: emailLower, mode: "insensitive" },
    },
    include: {
      groups: {
        select: { id: true },
        take: 1,
      },
    },
  });
  
  // If user already has a Viewer record with group membership, they were pre-approved
  // and already received an invite email - skip sending duplicate "Access granted" email
  if (viewer && viewer.groups.length > 0) {
    console.log("[WELCOME_EMAIL] Skipping - user was pre-approved:", emailLower);
    return;
  }
  
  // Also check if user is in any link's allowList (another form of pre-approval)
  const linkWithEmail = await prisma.link.findFirst({
    where: {
      allowList: { has: emailLower },
      deletedAt: null,
      isArchived: false,
    },
    select: { id: true },
  });
  
  if (linkWithEmail) {
    console.log("[WELCOME_EMAIL] Skipping - user was in allowList:", emailLower);
    return;
  }
  
  // User is new and was not pre-approved - send welcome email
  const emailTemplate = ViewerWelcomeEmail({ 
    name, 
    dataroomName: undefined,
    accessLink: `${process.env.NEXT_PUBLIC_BASE_URL}/viewer-portal`,
  });
  
  try {
    await sendEmail({
      to: email as string,
      from: "BF Fund <dataroom@investors.bermudafranchisegroup.com>",
      subject: "Welcome to BF Fund Investor Portal",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
    console.log("[WELCOME_EMAIL] Sent to new user:", emailLower);
  } catch (e) {
    console.error(e);
  }
};
