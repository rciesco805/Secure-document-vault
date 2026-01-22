import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { 
  createInquiry, 
  resumeInquiry, 
  getInquiry,
  isPersonaConfigured, 
  getPersonaEnvironmentId,
  getPersonaTemplateId,
  mapPersonaStatus 
} from "@/lib/persona";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get investor from session cookie (same as LP auth)
  const investorId = req.cookies["bf-investor-id"];
  
  if (!investorId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, investorId);
  } else if (req.method === "POST") {
    return handlePost(req, res, investorId);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  investorId: string
) {
  try {
    if (!isPersonaConfigured()) {
      return res.status(200).json({
        configured: false,
        status: "NOT_CONFIGURED",
        message: "KYC verification is not configured",
      });
    }

    // Get investor KYC status using raw query
    const investors = await prisma.$queryRaw<Array<{
      id: string;
      personaInquiryId: string | null;
      personaStatus: string;
      personaVerifiedAt: Date | null;
      personaReferenceId: string | null;
    }>>`
      SELECT id, "personaInquiryId", "personaStatus", "personaVerifiedAt", "personaReferenceId"
      FROM "Investor"
      WHERE id = ${investorId}
      LIMIT 1
    `;

    if (!investors || investors.length === 0) {
      return res.status(404).json({ message: "Investor not found" });
    }

    const investor = investors[0];

    // If there's an existing inquiry, get its current status from Persona
    if (investor.personaInquiryId && investor.personaStatus === "PENDING") {
      try {
        const inquiry = await getInquiry(investor.personaInquiryId);
        const currentStatus = mapPersonaStatus(inquiry.attributes.status);
        
        // Update if status changed
        if (currentStatus !== investor.personaStatus) {
          await prisma.$executeRaw`
            UPDATE "Investor" 
            SET "personaStatus" = ${currentStatus},
                "updatedAt" = NOW()
            WHERE id = ${investorId}
          `;
          investor.personaStatus = currentStatus;
        }
      } catch (err) {
        console.error("[KYC] Error fetching inquiry status:", err);
      }
    }

    return res.status(200).json({
      configured: true,
      status: investor.personaStatus,
      inquiryId: investor.personaInquiryId,
      verifiedAt: investor.personaVerifiedAt,
      environmentId: getPersonaEnvironmentId(),
      templateId: getPersonaTemplateId(),
    });
  } catch (error) {
    console.error("[KYC] Error getting status:", error);
    return res.status(500).json({ message: "Failed to get KYC status" });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  investorId: string
) {
  try {
    if (!isPersonaConfigured()) {
      return res.status(400).json({
        message: "KYC verification is not configured",
      });
    }

    const { action } = req.body;

    // Get investor details
    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }

    // Get Persona fields using raw query
    const personaData = await prisma.$queryRaw<Array<{
      personaInquiryId: string | null;
      personaStatus: string;
    }>>`
      SELECT "personaInquiryId", "personaStatus"
      FROM "Investor"
      WHERE id = ${investorId}
      LIMIT 1
    `;

    const personaInfo = personaData[0];

    if (action === "start" || action === "resume") {
      // If there's an existing pending inquiry, resume it
      if (personaInfo?.personaInquiryId && personaInfo.personaStatus === "PENDING") {
        try {
          const { sessionToken } = await resumeInquiry(personaInfo.personaInquiryId);
          return res.status(200).json({
            action: "resume",
            inquiryId: personaInfo.personaInquiryId,
            sessionToken,
            environmentId: getPersonaEnvironmentId(),
          });
        } catch (err) {
          console.error("[KYC] Error resuming inquiry:", err);
          // Fall through to create new inquiry
        }
      }

      // Create new inquiry
      const nameParts = (investor.user.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const referenceId = `inv_${investor.id}_${Date.now()}`;

      const inquiry = await createInquiry({
        referenceId,
        email: investor.user.email || "",
        firstName,
        lastName,
      });

      // Update investor with new inquiry
      await prisma.$executeRaw`
        UPDATE "Investor" 
        SET "personaInquiryId" = ${inquiry.id},
            "personaReferenceId" = ${referenceId},
            "personaStatus" = ${mapPersonaStatus(inquiry.attributes.status)},
            "updatedAt" = NOW()
        WHERE id = ${investorId}
      `;

      // Get session token for the new inquiry
      const { sessionToken } = await resumeInquiry(inquiry.id);

      return res.status(200).json({
        action: "start",
        inquiryId: inquiry.id,
        sessionToken,
        environmentId: getPersonaEnvironmentId(),
      });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("[KYC] Error:", error);
    return res.status(500).json({ message: "Failed to process KYC request" });
  }
}
