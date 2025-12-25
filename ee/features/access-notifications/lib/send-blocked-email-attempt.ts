import { sendEmail } from "@/lib/resend";

import BlockedEmailAttempt from "../components/blocked-email-attempt";

export const sendBlockedEmailAttemptNotification = async ({
  to,
  cc,
  blockedEmail,
  linkName,
  resourceName,
  resourceType = "document",
  timestamp,
  locationString,
  accessType,
  adminUrl,
}: {
  to: string;
  cc?: string[];
  blockedEmail: string;
  linkName: string;
  resourceName: string;
  resourceType?: "document" | "dataroom";
  timestamp?: string;
  locationString?: string;
  accessType: "global" | "allow" | "deny";
  adminUrl?: string;
}) => {
  const emailTemplate = BlockedEmailAttempt({
    blockedEmail,
    linkName,
    resourceName,
    resourceType,
    timestamp,
    locationString,
    accessType,
    adminUrl,
  });
  try {
    await sendEmail({
      to,
      cc,
      subject: `Blocked access attempt to ${resourceType}: ${resourceName}`,
      react: emailTemplate,
      system: true,
      test: process.env.NODE_ENV === "development",
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};
