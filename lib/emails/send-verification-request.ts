import { sendEmail } from "@/lib/resend";
import prisma from "@/lib/prisma";

import LoginLink from "@/components/emails/verification-link";

import { generateChecksum } from "../utils/generate-checksum";

/**
 * Check if a verification email was recently sent to prevent duplicates.
 * This prevents users from accidentally requesting multiple magic links.
 * 
 * Note: NextAuth creates the verification token BEFORE calling sendVerificationRequest.
 * We check for multiple unexpired tokens - if there's more than one, a previous recent
 * request exists. We skip the newest token (the one just created for this request).
 */
async function wasRecentEmailSent(email: string): Promise<boolean> {
  try {
    // Get all unexpired tokens, ordered by expiry (newest first)
    const unexpiredTokens = await prisma.verificationToken.findMany({
      where: {
        identifier: email.toLowerCase(),
        expires: {
          gt: new Date(),
        },
      },
      orderBy: {
        expires: 'desc',
      },
      take: 5,
    });

    console.log(`[EMAIL] Duplicate check: Found ${unexpiredTokens.length} unexpired token(s) for ${email}`);

    // If there's more than one unexpired token, the older ones are from previous requests
    // Skip the first one (newest - just created by NextAuth for this request)
    if (unexpiredTokens.length > 1) {
      console.log(`[EMAIL] Duplicate prevention: Email to ${email} blocked - ${unexpiredTokens.length - 1} previous unexpired token(s) exist`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[EMAIL] Error checking for recent verification token:", error);
    // On error, allow the email to be sent (fail open)
    return false;
  }
}

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  
  // Check if we recently sent an email to this address
  const recentlySent = await wasRecentEmailSent(email);
  if (recentlySent) {
    console.log(`[EMAIL] Skipping duplicate verification email to: ${email}`);
    // Don't throw - just silently skip to avoid confusing the user
    return;
  }
  
  console.log("[EMAIL] Sending verification email to:", email);
  
  const checksum = generateChecksum(url);
  const verificationUrlParams = new URLSearchParams({
    verification_url: url,
    checksum,
  });

  // Use fallback URL if set (for when custom domain DNS is propagating)
  const baseUrl = process.env.VERIFICATION_EMAIL_BASE_URL || process.env.NEXTAUTH_URL;
  const verificationUrl = `${baseUrl}/verify?${verificationUrlParams}`;
  console.log("[EMAIL] Verification URL:", verificationUrl);
  
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
    throw e; // Re-throw to let NextAuth know about the error
  }
};
