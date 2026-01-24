import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fundId } = req.query;
  if (!fundId || typeof fundId !== "string") {
    return res.status(400).json({ message: "Fund ID required" });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { teams: true },
  });

  if (!user) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: { team: true },
  });

  if (!fund) {
    return res.status(404).json({ message: "Fund not found" });
  }

  const teamMembership = user.teams.find((t) => t.teamId === fund.teamId);
  if (!teamMembership || !["ADMIN", "OWNER", "SUPER_ADMIN"].includes(teamMembership.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  if (req.method === "GET") {
    try {
      const tiers = await prisma.fundPricingTier.findMany({
        where: { fundId },
        orderBy: { tranche: "asc" },
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      });

      return res.status(200).json({
        tiers: tiers.map((t) => ({
          id: t.id,
          tranche: t.tranche,
          pricePerUnit: t.pricePerUnit.toString(),
          unitsAvailable: t.unitsAvailable,
          unitsTotal: t.unitsTotal,
          isActive: t.isActive,
          subscriptionCount: t._count.subscriptions,
          createdAt: t.createdAt.toISOString(),
        })),
        flatModeEnabled: fund.flatModeEnabled,
      });
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      return res.status(500).json({ message: "Failed to fetch pricing tiers" });
    }
  }

  if (req.method === "POST") {
    try {
      const { tranche, pricePerUnit, unitsTotal } = req.body;

      if (!tranche || !pricePerUnit || !unitsTotal) {
        return res.status(400).json({
          message: "Tranche, price per unit, and units total are required",
        });
      }

      const existing = await prisma.fundPricingTier.findUnique({
        where: { fundId_tranche: { fundId, tranche: parseInt(tranche) } },
      });

      if (existing) {
        return res.status(400).json({
          message: `Tier ${tranche} already exists for this fund`,
        });
      }

      const tier = await prisma.fundPricingTier.create({
        data: {
          fundId,
          tranche: parseInt(tranche),
          pricePerUnit: parseFloat(pricePerUnit),
          unitsTotal: parseInt(unitsTotal),
          unitsAvailable: parseInt(unitsTotal),
          isActive: tranche === 1,
        },
      });

      return res.status(201).json({
        tier: {
          id: tier.id,
          tranche: tier.tranche,
          pricePerUnit: tier.pricePerUnit.toString(),
          unitsAvailable: tier.unitsAvailable,
          unitsTotal: tier.unitsTotal,
          isActive: tier.isActive,
        },
      });
    } catch (error) {
      console.error("Error creating pricing tier:", error);
      return res.status(500).json({ message: "Failed to create pricing tier" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { flatModeEnabled } = req.body;

      if (typeof flatModeEnabled !== "boolean") {
        return res.status(400).json({ message: "flatModeEnabled must be a boolean" });
      }

      await prisma.fund.update({
        where: { id: fundId },
        data: { flatModeEnabled },
      });

      return res.status(200).json({
        success: true,
        flatModeEnabled,
      });
    } catch (error) {
      console.error("Error updating flat mode:", error);
      return res.status(500).json({ message: "Failed to update flat mode" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { tierId } = req.body;

      if (!tierId) {
        return res.status(400).json({ message: "Tier ID required" });
      }

      const tier = await prisma.fundPricingTier.findUnique({
        where: { id: tierId },
        include: { _count: { select: { subscriptions: true } } },
      });

      if (!tier) {
        return res.status(404).json({ message: "Tier not found" });
      }

      if (tier._count.subscriptions > 0) {
        return res.status(400).json({
          message: "Cannot delete tier with existing subscriptions",
        });
      }

      await prisma.fundPricingTier.delete({
        where: { id: tierId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting pricing tier:", error);
      return res.status(500).json({ message: "Failed to delete pricing tier" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
