import { getCustomEmail } from "@/lib/edge-config/custom-email";
import { redis } from "@/lib/redis";
import { sendEmail } from "@/lib/resend";

import OtpEmailVerification from "@/components/emails/otp-verification";

const DEFAULT_SENDER = "BF Fund Dataroom <dataroom@investors.bermudafranchisegroup.com>";

export const sendOtpVerificationEmail = async (
  email: string,
  code: string,
  isDataroom: boolean = false,
  teamId: string,
  magicLink?: string,
) => {
  let logo: string | null = null;
  let from: string = DEFAULT_SENDER;

  const customEmail = await getCustomEmail(teamId);

  if (customEmail && teamId) {
    from = customEmail;
    if (redis) {
      logo = await redis.get(`brand:logo:${teamId}`);
    }
  }

  const emailTemplate = OtpEmailVerification({
    email,
    code,
    isDataroom,
    logo: logo ?? undefined,
    magicLink,
  });

  try {
    await sendEmail({
      from,
      to: email,
      subject: `Access your ${isDataroom ? "dataroom" : "document"} - BF Fund`,
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
      verify: true,
    });
    return { success: true };
  } catch (e) {
    console.error("Failed to send OTP verification email:", e);
    return { success: false, error: e };
  }
};
