/**
 * Persona KYC Hooks
 * 
 * Post-document completion hooks for triggering Persona verification.
 */

import prisma from "@/lib/prisma";
import { createInquiry, isPersonaConfigured, mapPersonaStatus } from "@/lib/persona";

interface TriggerVerificationParams {
  email: string;
  name: string;
  documentId: string;
  teamId: string;
}

/**
 * Trigger Persona KYC verification for an investor after document signing
 * Called post-subscription document completion
 */
export async function triggerPersonaVerification({
  email,
  name,
  documentId,
  teamId,
}: TriggerVerificationParams): Promise<void> {
  if (!isPersonaConfigured()) {
    console.log("[PERSONA] Persona not configured (PERSONA_API_KEY or PERSONA_TEMPLATE_ID missing), skipping KYC verification");
    return;
  }
  
  // Verify the Persona columns exist by checking if we can query them
  try {
    await prisma.$queryRaw`SELECT "personaStatus" FROM "Investor" LIMIT 1`;
  } catch (err) {
    console.error("[PERSONA] Persona columns not found in database, run migrations first");
    return;
  }

  try {
    // @ts-ignore - Field exists at runtime
    const investor = await prisma.investor.findFirst({
      where: {
        user: { email },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!investor) {
      console.log(`[PERSONA] No investor found for email ${email}, skipping KYC`);
      return;
    }

    // @ts-ignore - Field exists at runtime
    if (investor.personaStatus === "APPROVED") {
      console.log(`[PERSONA] Investor ${email} already KYC verified, skipping`);
      return;
    }

    // @ts-ignore - Field exists at runtime
    if (investor.personaInquiryId && investor.personaStatus === "PENDING") {
      console.log(`[PERSONA] Investor ${email} has pending KYC, skipping new inquiry`);
      return;
    }

    // Parse name into first/last
    const nameParts = name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create reference ID for tracking
    const referenceId = `inv_${investor.id}_${Date.now()}`;

    // Create Persona inquiry
    const inquiry = await createInquiry({
      referenceId,
      email,
      firstName,
      lastName,
    });

    // Update investor with Persona inquiry details
    // @ts-ignore - Persona fields exist at runtime after schema push
    await prisma.$executeRaw`
      UPDATE "Investor" 
      SET "personaInquiryId" = ${inquiry.id},
          "personaReferenceId" = ${referenceId},
          "personaStatus" = ${mapPersonaStatus(inquiry.attributes.status)},
          "personaData" = ${JSON.stringify({
            createdAt: inquiry.attributes["created-at"],
            documentId,
            teamId,
          })}::jsonb,
          "updatedAt" = NOW()
      WHERE id = ${investor.id}
    `;

    console.log(`[PERSONA] Created inquiry ${inquiry.id} for investor ${email}`);

    // Note: The actual verification link will be provided to the investor
    // via the LP portal embedded flow, not via email redirect
  } catch (error) {
    console.error(`[PERSONA] Error triggering verification for ${email}:`, error);
    throw error;
  }
}

/**
 * Update investor KYC status from Persona webhook
 */
export async function updateInvestorKycStatus({
  inquiryId,
  status,
  referenceId,
  data,
}: {
  inquiryId: string;
  status: string;
  referenceId: string;
  data: Record<string, any>;
}): Promise<void> {
  try {
    // Find investor by Persona inquiry ID or reference ID using raw query
    const investors = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Investor" 
      WHERE "personaInquiryId" = ${inquiryId} 
         OR "personaReferenceId" = ${referenceId}
      LIMIT 1
    `;

    if (!investors || investors.length === 0) {
      console.error(`[PERSONA] No investor found for inquiry ${inquiryId}`);
      return;
    }

    const investorId = investors[0].id;
    const mappedStatus = mapPersonaStatus(status);
    const isApproved = mappedStatus === "APPROVED";

    // Update using raw SQL to avoid TS issues with new fields
    if (isApproved) {
      await prisma.$executeRaw`
        UPDATE "Investor" 
        SET "personaInquiryId" = ${inquiryId},
            "personaStatus" = ${mappedStatus},
            "personaVerifiedAt" = NOW(),
            "personaData" = ${JSON.stringify(data)}::jsonb,
            "accreditationStatus" = 'KYC_VERIFIED',
            "accreditationExpiresAt" = ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)},
            "updatedAt" = NOW()
        WHERE id = ${investorId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "Investor" 
        SET "personaInquiryId" = ${inquiryId},
            "personaStatus" = ${mappedStatus},
            "personaData" = ${JSON.stringify(data)}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${investorId}
      `;
    }

    console.log(`[PERSONA] Updated investor KYC status to ${mappedStatus}`);
  } catch (error) {
    console.error(`[PERSONA] Error updating KYC status:`, error);
    throw error;
  }
}
