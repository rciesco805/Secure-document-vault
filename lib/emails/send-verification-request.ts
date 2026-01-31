import crypto from "crypto";
import { sendEmail } from "@/lib/resend";
import prisma from "@/lib/prisma";

import LoginLink from "@/components/emails/verification-link";

import { generateChecksum } from "../utils/generate-checksum";

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  
  console.log("[EMAIL] Sending verification email to:", email);
  
  const magicLinkToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  
  await prisma.magicLinkCallback.create({
    data: {
      identifier: email.toLowerCase(),
      token: magicLinkToken,
      callbackUrl: url,
      authTokenHash: "",
      expires: expiresAt,
    },
  });
  
  console.log("[EMAIL] Created MagicLinkCallback entry for:", email);
  
  const checksum = generateChecksum(magicLinkToken);
  const verificationUrlParams = new URLSearchParams({
    id: magicLinkToken,
    checksum,
  });

  const baseUrl = process.env.VERIFICATION_EMAIL_BASE_URL || process.env.NEXTAUTH_URL;
  const verificationUrl = `${baseUrl}/verify?${verificationUrlParams}`;
  console.log("[EMAIL] Verification URL (secure, no callback):", verificationUrl.substring(0, 80) + "...");
  
  const emailTemplate = LoginLink({ url: verificationUrl });
  try {
    await sendEmail({
      to: email as string,
      from: "BF Fund Portal <dataroom@investors.bermudafranchisegroup.com>",
      subject: "Your BF Fund Portal Login Link",
      react: emailTemplate,
    });
    console.log("[EMAIL] Verification email sent successfully");
  } catch (e) {
    console.error("[EMAIL] Error sending verification email:", e);
    throw e;
  }
};
