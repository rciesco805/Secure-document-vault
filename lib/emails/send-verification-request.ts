import crypto from "crypto";
import { sendEmail } from "@/lib/resend";
import prisma from "@/lib/prisma";

import LoginLink from "@/components/emails/verification-link";

import { generateChecksum } from "../utils/generate-checksum";

function extractTokenFromCallbackUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("token");
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function wasRecentEmailSent(email: string): Promise<boolean> {
  try {
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

    if (unexpiredTokens.length > 1) {
      console.log(`[EMAIL] Duplicate prevention: Email to ${email} blocked - ${unexpiredTokens.length - 1} previous unexpired token(s) exist`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[EMAIL] Error checking for recent verification token:", error);
    return false;
  }
}

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  
  const recentlySent = await wasRecentEmailSent(email);
  if (recentlySent) {
    console.log(`[EMAIL] Skipping duplicate verification email to: ${email}`);
    return;
  }
  
  console.log("[EMAIL] Sending verification email to:", email);
  
  const authToken = extractTokenFromCallbackUrl(url);
  if (!authToken) {
    console.error("[EMAIL] Could not extract token from callback URL");
    throw new Error("Invalid callback URL - no token found");
  }
  
  const authTokenHash = hashToken(authToken);
  const magicLinkToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
  
  await prisma.magicLinkCallback.create({
    data: {
      identifier: email.toLowerCase(),
      token: magicLinkToken,
      callbackUrl: url,
      authTokenHash: authTokenHash,
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
