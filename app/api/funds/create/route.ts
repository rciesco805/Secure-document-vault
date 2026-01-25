import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      style,
      targetRaise,
      minimumInvestment,
      aumTarget,
      callFrequency,
      thresholdEnabled,
      thresholdAmount,
      stagedCommitmentsEnabled,
      teamId,
    } = body;

    if (!name || !targetRaise || !minimumInvestment || !teamId) {
      return NextResponse.json(
        { error: "Missing required fields: name, targetRaise, minimumInvestment, teamId" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        users: {
          some: {
            userId: session.user.id,
            role: { in: ["ADMIN", "OWNER"] },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found or insufficient permissions" },
        { status: 403 }
      );
    }

    const fund = await prisma.fund.create({
      data: {
        teamId,
        name,
        description: description || null,
        style: style || null,
        targetRaise: parseFloat(targetRaise),
        minimumInvestment: parseFloat(minimumInvestment),
        aumTarget: aumTarget ? parseFloat(aumTarget) : null,
        callFrequency: callFrequency || "AS_NEEDED",
        capitalCallThresholdEnabled: thresholdEnabled || false,
        capitalCallThreshold: thresholdAmount ? parseFloat(thresholdAmount) : null,
        stagedCommitmentsEnabled: stagedCommitmentsEnabled || false,
        createdBy: session.user.id,
        audit: [
          {
            timestamp: new Date().toISOString(),
            userId: session.user.id,
            action: "FUND_CREATED",
            details: { name, targetRaise, minimumInvestment },
          },
        ],
      },
    });

    await prisma.fundAggregate.create({
      data: {
        fundId: fund.id,
        totalInbound: 0,
        totalOutbound: 0,
        totalCommitted: 0,
        thresholdEnabled: thresholdEnabled || false,
        thresholdAmount: thresholdAmount ? parseFloat(thresholdAmount) : null,
        audit: [
          {
            timestamp: new Date().toISOString(),
            action: "AGGREGATE_CREATED",
            fundId: fund.id,
          },
        ],
      },
    });

    return NextResponse.json({ 
      success: true, 
      fund: { id: fund.id, name: fund.name } 
    });
  } catch (error: any) {
    console.error("Fund creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create fund" },
      { status: 500 }
    );
  }
}
