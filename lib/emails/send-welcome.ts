import { sendEmail } from "@/lib/resend";
import prisma from "@/lib/prisma";
import { ADMIN_EMAILS } from "@/lib/constants/admins";

import WelcomeEmail from "@/components/emails/welcome";
import ViewerWelcomeEmail from "@/components/emails/viewer-welcome";

import { CreateUserEmailProps } from "../types";

export const sendWelcomeEmail = async (params: CreateUserEmailProps) => {
  const { name, email } = params.user;
  
  if (!email) return;
  
  const emailLower = email.toLowerCase().trim();
  
  const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(emailLower);
  
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
  
  const viewer = await prisma.viewer.findFirst({
    where: {
      email: { equals: emailLower, mode: "insensitive" },
    },
    include: {
      groups: {
        include: {
          group: {
            include: {
              dataroom: {
                select: {
                  id: true,
                  name: true,
                  links: {
                    where: { deletedAt: null, isArchived: false },
                    select: { id: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  
  let dataroomName: string | undefined;
  let accessLink = `${process.env.NEXT_PUBLIC_BASE_URL}/viewer-portal`;
  
  if (viewer && viewer.groups.length > 0) {
    const firstGroup = viewer.groups[0];
    const dataroom = firstGroup?.group?.dataroom;
    dataroomName = dataroom?.name;
    const linkId = dataroom?.links?.[0]?.id;
    
    if (linkId) {
      accessLink = `${process.env.NEXT_PUBLIC_BASE_URL}/view/${linkId}`;
    }
  }
  
  const emailTemplate = ViewerWelcomeEmail({ 
    name, 
    dataroomName,
    accessLink,
  });
  
  try {
    await sendEmail({
      to: email as string,
      from: "BF Fund <dataroom@investors.bermudafranchisegroup.com>",
      subject: dataroomName 
        ? `Access granted: ${dataroomName}`
        : "Welcome to BF Fund Investor Portal",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};
