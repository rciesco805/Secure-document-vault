import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getUserWithRole } from "@/lib/auth/with-role";

export interface FeeConfig {
  managementFee: {
    rate: number;
    frequency: "MONTHLY" | "QUARTERLY" | "ANNUALLY";
    calculationBasis: "COMMITTED" | "CALLED" | "NAV";
  };
  performanceFee: {
    carriedInterest: number;
    hurdleRate: number;
    catchUp: boolean;
    catchUpPercentage?: number;
  };
  organizationalFees: {
    amount: number;
    amortizePeriod?: number;
  };
  expenseRatio?: number;
  adminFee?: number;
}

export interface TierConfig {
  tiers: Array<{
    id: string;
    name: string;
    minInvestment: number;
    maxInvestment?: number;
    managementFeeDiscount?: number;
    performanceFeeDiscount?: number;
    benefits?: string[];
  }>;
  defaultTierId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { user, error, statusCode } = await getUserWithRole(req, res);

  if (!user || user.role !== "GP") {
    return res.status(statusCode || 403).json({ message: error || "GP access required" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Entity ID required" });
  }

  const entity = await prisma.entity.findUnique({
    where: { id },
    include: { team: true },
  });

  if (!entity || !user.teamIds?.includes(entity.teamId)) {
    return res.status(404).json({ message: "Entity not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      id: entity.id,
      name: entity.name,
      mode: entity.mode,
      feeConfig: entity.feeConfig,
      tierConfig: entity.tierConfig,
      customSettings: entity.customSettings,
    });
  }

  if (req.method === "PUT") {
    try {
      const { feeConfig, tierConfig, customSettings } = req.body;

      if (feeConfig) {
        validateFeeConfig(feeConfig);
      }

      if (tierConfig) {
        validateTierConfig(tierConfig);
      }

      const updated = await prisma.entity.update({
        where: { id },
        data: {
          feeConfig: feeConfig !== undefined ? feeConfig : entity.feeConfig,
          tierConfig: tierConfig !== undefined ? tierConfig : entity.tierConfig,
          customSettings: customSettings !== undefined ? customSettings : entity.customSettings,
        },
      });

      return res.status(200).json({
        success: true,
        entity: {
          id: updated.id,
          feeConfig: updated.feeConfig,
          tierConfig: updated.tierConfig,
          customSettings: updated.customSettings,
        },
      });
    } catch (error: any) {
      console.error("Error updating entity config:", error);
      return res.status(400).json({ message: error.message || "Invalid configuration" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}

function validateFeeConfig(config: FeeConfig) {
  if (config.managementFee) {
    if (typeof config.managementFee.rate !== "number" || config.managementFee.rate < 0 || config.managementFee.rate > 100) {
      throw new Error("Management fee rate must be between 0 and 100");
    }
    if (!["MONTHLY", "QUARTERLY", "ANNUALLY"].includes(config.managementFee.frequency)) {
      throw new Error("Invalid management fee frequency");
    }
    if (!["COMMITTED", "CALLED", "NAV"].includes(config.managementFee.calculationBasis)) {
      throw new Error("Invalid management fee calculation basis");
    }
  }

  if (config.performanceFee) {
    if (typeof config.performanceFee.carriedInterest !== "number" || config.performanceFee.carriedInterest < 0 || config.performanceFee.carriedInterest > 100) {
      throw new Error("Carried interest must be between 0 and 100");
    }
    if (typeof config.performanceFee.hurdleRate !== "number" || config.performanceFee.hurdleRate < 0) {
      throw new Error("Hurdle rate must be non-negative");
    }
  }
}

function validateTierConfig(config: TierConfig) {
  if (!Array.isArray(config.tiers)) {
    throw new Error("Tiers must be an array");
  }

  for (const tier of config.tiers) {
    if (!tier.id || !tier.name) {
      throw new Error("Each tier must have an id and name");
    }
    if (typeof tier.minInvestment !== "number" || tier.minInvestment < 0) {
      throw new Error("Minimum investment must be non-negative");
    }
    if (tier.maxInvestment !== undefined && tier.maxInvestment <= tier.minInvestment) {
      throw new Error("Maximum investment must be greater than minimum");
    }
  }
}
