import prisma from "@/lib/prisma";

export type KycGateResult = {
  allowed: boolean;
  status: string;
  message?: string;
};

export async function checkKycGate(investorId: string): Promise<KycGateResult> {
  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    select: {
      personaStatus: true,
      personaVerifiedAt: true,
    },
  });

  if (!investor) {
    return {
      allowed: false,
      status: "NOT_FOUND",
      message: "Investor not found",
    };
  }

  const approvedStatuses = ["APPROVED", "VERIFIED"];
  
  if (approvedStatuses.includes(investor.personaStatus)) {
    return {
      allowed: true,
      status: investor.personaStatus,
    };
  }

  return {
    allowed: false,
    status: investor.personaStatus,
    message: "KYC verification required before proceeding with transactions",
  };
}

export async function enforceKycForTransaction(investorId: string): Promise<void> {
  const result = await checkKycGate(investorId);
  
  if (!result.allowed) {
    throw new Error(result.message || "KYC verification required");
  }
}
