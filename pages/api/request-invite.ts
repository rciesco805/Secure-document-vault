import { NextApiRequest, NextApiResponse } from "next";

import { z } from "zod";

import { createAdminMagicLink } from "@/lib/auth/admin-magic-link";
import { getAllAdminEmails, isUserAdminAsync } from "@/lib/constants/admins";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { strictRateLimiter } from "@/lib/security/rate-limiter";

import InviteRequest from "@/components/emails/invite-request";

const inviteRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address").min(1),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  company: z.string().trim().min(2, "Company name must be at least 2 characters"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const allowed = await strictRateLimiter(req, res);
  if (!allowed) return;

  try {
    const validation = inviteRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        message: "All fields are required and must be valid",
        errors: validation.error.errors,
      });
    }

    const { email, fullName, company } = validation.data;
    const emailLower = email.toLowerCase().trim();

    // Server-side defense-in-depth: check if user already has access
    const isAdmin = await isUserAdminAsync(emailLower);
    if (isAdmin) {
      return res.status(200).json({ 
        message: "You already have admin access. Please use the admin login.",
        hasAccess: true,
        isAdmin: true,
      });
    }

    // Check if user is already a viewer
    const existingViewer = await prisma.viewer.findFirst({
      where: {
        email: { equals: emailLower, mode: "insensitive" },
        accessRevokedAt: null,
      },
      select: { id: true }
    });
    if (existingViewer) {
      return res.status(200).json({ 
        message: "You already have access. Please enter your email on the login page.",
        hasAccess: true,
        isAdmin: false,
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://dataroom.bermudafranchisegroup.com";
    const quickAddPath = `/admin/quick-add?email=${encodeURIComponent(email)}`;
    
    // Get admin emails dynamically from the database
    const allAdminEmails = await getAllAdminEmails();
    
    // Filter out the requester's email - they shouldn't get notified about their own request
    const adminEmails = allAdminEmails.filter(
      (adminEmail) => adminEmail.toLowerCase().trim() !== emailLower
    );
    
    if (adminEmails.length === 0) {
      console.log("[REQUEST_INVITE] No admins to notify (requester is only admin)");
      return res.status(200).json({ message: "Request sent successfully" });
    }
    
    for (const adminEmail of adminEmails) {
      const magicLinkResult = await createAdminMagicLink({
        email: adminEmail,
        redirectPath: quickAddPath,
        baseUrl,
      });
      
      if (!magicLinkResult) {
        console.error("[REQUEST_INVITE] Failed to create magic link for:", adminEmail);
      } else {
        console.log("[REQUEST_INVITE] Magic link created for:", adminEmail);
      }
      
      const quickAddUrl = magicLinkResult?.magicLink || `${baseUrl}/login?next=${encodeURIComponent(quickAddPath)}`;
      const signInUrl = `${baseUrl}/login`;

      const emailTemplate = InviteRequest({
        email,
        fullName,
        company,
        signInUrl,
        quickAddUrl,
      });

      await sendEmail({
        to: adminEmail,
        from: "BF Fund Dataroom <noreply@investors.bermudafranchisegroup.com>",
        subject: `New Investor Access Request: ${fullName}`,
        react: emailTemplate,
        replyTo: email,
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    return res.status(200).json({ message: "Request sent successfully" });
  } catch (error: any) {
    console.error("Error sending invite request:", error);
    console.error("Error details:", error?.message || "Unknown error");
    console.error("Error name:", error?.name || "Unknown");
    return res.status(500).json({ 
      message: "Failed to send request",
      error: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}
