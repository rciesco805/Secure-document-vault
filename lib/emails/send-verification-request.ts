import { sendEmail } from "@/lib/resend";

import LoginLink from "@/components/emails/verification-link";

import { generateChecksum } from "../utils/generate-checksum";

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  console.log("[EMAIL] Sending verification email to:", email);
  
  const checksum = generateChecksum(url);
  const verificationUrlParams = new URLSearchParams({
    verification_url: url,
    checksum,
  });

  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify?${verificationUrlParams}`;
  console.log("[EMAIL] Verification URL:", verificationUrl);
  
  const emailTemplate = LoginLink({ url: verificationUrl });
  try {
    await sendEmail({
      to: email as string,
      from: "BF Fund Portal <noreply@investors.bermudafranchisegroup.com>",
      subject: "Your BF Fund Portal Login Link",
      react: emailTemplate,
    });
    console.log("[EMAIL] Verification email sent successfully");
  } catch (e) {
    console.error("[EMAIL] Error sending verification email:", e);
    throw e; // Re-throw to let NextAuth know about the error
  }
};
