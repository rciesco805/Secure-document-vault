import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getUserWithRole, requireRole } from "@/lib/auth/with-role";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const result = await getUserWithRole(req, res);
    const roleCheck = requireRole(["GP"], result);

    if (!roleCheck.allowed) {
      return res.status(roleCheck.statusCode || 403).json({
        message: roleCheck.error,
      });
    }

    const user = result.user!;
    const { fundId, actionType, totalAmount, allocationType = "pro_rata", selectedInvestors } = req.body;

    if (!fundId || !actionType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    if (!["capital_call", "distribution"].includes(actionType)) {
      return res.status(400).json({ message: "Invalid action type" });
    }

    if (!["equal", "pro_rata"].includes(allocationType)) {
      return res.status(400).json({ message: "Invalid allocation type" });
    }

    const fund = await prisma.fund.findFirst({
      where: {
        id: fundId,
        teamId: { in: user.teamIds },
      },
      include: {
        investments: {
          include: {
            investor: true,
          },
        },
      },
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }

    let investors = fund.investments;
    if (selectedInvestors && selectedInvestors.length > 0) {
      investors = investors.filter((inv) =>
        selectedInvestors.includes(inv.investorId)
      );
    }

    if (investors.length === 0) {
      return res.status(400).json({ message: "No investors selected" });
    }

    const totalCommitments = investors.reduce(
      (sum, inv) => sum + Number(inv.commitmentAmount),
      0
    );

    if (allocationType === "pro_rata" && totalCommitments === 0) {
      return res.status(400).json({ message: "Cannot use pro-rata allocation: no commitments found" });
    }

    const allocations = investors.map((inv) => {
      let allocationAmount: number;

      if (allocationType === "equal") {
        allocationAmount = amount / investors.length;
      } else {
        const share = Number(inv.commitmentAmount) / totalCommitments;
        allocationAmount = amount * share;
      }

      return {
        investorId: inv.investorId,
        investorName: inv.investor.entityName || "Unknown",
        commitment: Number(inv.commitmentAmount),
        allocation: Math.round(allocationAmount * 100) / 100,
        percentage: totalCommitments > 0
          ? Math.round((Number(inv.commitmentAmount) / totalCommitments) * 10000) / 100
          : Math.round((100 / investors.length) * 100) / 100,
      };
    });

    if (actionType === "capital_call") {
      const callNumber = await prisma.capitalCall.count({
        where: { fundId },
      });

      const capitalCall = await prisma.capitalCall.create({
        data: {
          fundId,
          callNumber: callNumber + 1,
          amount: amount,
          purpose: `Capital Call #${callNumber + 1}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "PENDING",
          responses: {
            create: allocations.map((a) => ({
              investorId: a.investorId,
              amountDue: a.allocation,
              status: "PENDING",
            })),
          },
        },
      });

      return res.status(200).json({
        success: true,
        actionType: "capital_call",
        capitalCallId: capitalCall.id,
        allocations,
        message: `Capital call created for ${allocations.length} investors`,
      });
    } else if (actionType === "distribution") {
      const distNumber = await prisma.distribution.count({
        where: { fundId },
      });

      const distribution = await prisma.distribution.create({
        data: {
          fundId,
          distributionNumber: distNumber + 1,
          totalAmount: amount,
          distributionType: "DIVIDEND",
          distributionDate: new Date(),
          status: "PENDING",
        },
      });

      return res.status(200).json({
        success: true,
        actionType: "distribution",
        distributionId: distribution.id,
        allocations,
        message: `Distribution created for ${allocations.length} investors`,
      });
    }

    return res.status(400).json({ message: "Invalid action type" });
  } catch (error) {
    console.error("Error processing bulk action:", error);
    return res.status(500).json({ message: "Failed to process bulk action" });
  }
}
