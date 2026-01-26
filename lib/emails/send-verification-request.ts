import { sendEmail } from "@/lib/resend";
import prisma from "@/lib/prisma";

import LoginLink from "@/components/emails/verification-link";

import { generateChecksum } from "../utils/generate-checksum";

// Minimum time between verification emails (in minutes)
const DUPLICATE_EMAIL_THRESHOLD_MINUTES = 2;

/**
 * Check if a verification email was recently sent to prevent duplicates.
 * This prevents users from accidentally requesting multiple magic links.
 */
async function wasRecentEmailSent(email: string): Promise<boolean> {
  try {
    const thresholdTime = new Date(Date.now() - DUPLICATE_EMAIL_THRESHOLD_MINUTES * 60 * 1000);
    
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase(),
        expires: {
          gt: new Date(), // Token hasn't expired yet
        },
      },
      orderBy: {
        expires: 'desc',
      },
    });

    if (recentToken) {
      // Check if the token was created recently (within threshold)
      // Token expiry is set to maxAge (20 min) from creation time
      // So we can estimate creation time from expiry - 20 min
      const estimatedCreationTime = new Date(recentToken.expires.getTime() - 20 * 60 * 1000);
      if (estimatedCreationTime > thresholdTime) {
        console.log(`[EMAIL] Duplicate prevention: Email to ${email} blocked - recent token exists (created ~${Math.round((Date.now() - estimatedCreationTime.getTime()) / 1000)}s ago)`);
        return true;
      }
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
