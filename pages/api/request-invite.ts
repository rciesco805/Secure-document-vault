import { NextApiRequest, NextApiResponse } from "next";

import { z } from "zod";

import { sendEmail } from "@/lib/resend";

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

  try {
    const validation = inviteRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        message: "All fields are required and must be valid",
        errors: validation.error.errors,
      });
    }

    const { email, fullName, company } = validation.data;

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://bfg-dataroom.replit.app";
    const signInUrl = `${baseUrl}/login`;

    const emailTemplate = InviteRequest({
      email,
      fullName,
      company,
      signInUrl,
    });

    await sendEmail({
      to: "investors@bermudafranchisegroup.com",
      from: "BF Fund Portal <noreply@investors.bermudafranchisegroup.com>",
      subject: `New Investor Access Request: ${fullName}`,
      react: emailTemplate,
      replyTo: email,
    });

    return res.status(200).json({ message: "Request sent successfully" });
  } catch (error) {
    console.error("Error sending invite request:", error);
    return res.status(500).json({ message: "Failed to send request" });
  }
}
