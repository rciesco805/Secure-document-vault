import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { fundId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { role: { in: ["ADMIN", "OWNER"] } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: { aggregate: true },
    });

    if (!fund) {
      return NextResponse.json({ message: "Fund not found" }, { status: 404 });
    }

    const hasAccess = user.teams.some((ut) => ut.teamId === fund.teamId);
    if (!hasAccess) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const aggregate = fund.aggregate;

    // Get initial threshold values (prioritize new fields, fallback to legacy)
    const initialThresholdEnabled = fund.initialThresholdEnabled || 
      aggregate?.initialThresholdEnabled || 
      fund.capitalCallThresholdEnabled ||
      aggregate?.thresholdEnabled || 
      false;
    
    const initialThresholdAmount = fund.initialThresholdAmount 
      ? Number(fund.initialThresholdAmount)
      : aggregate?.initialThresholdAmount 
        ? Number(aggregate.initialThresholdAmount)
        : fund.capitalCallThreshold
          ? Number(fund.capitalCallThreshold)
          : aggregate?.thresholdAmount
            ? Number(aggregate.thresholdAmount)
            : null;

    // Full authorized amount
    const fullAuthorizedAmount = fund.fullAuthorizedAmount
      ? Number(fund.fullAuthorizedAmount)
      : aggregate?.fullAuthorizedAmount
        ? Number(aggregate.fullAuthorizedAmount)
        : null;

    // Aggregate values
    const totalCommitted = aggregate ? Number(aggregate.totalCommitted) : 0;
    const totalInbound = aggregate ? Number(aggregate.totalInbound) : 0;
    const totalOutbound = aggregate ? Number(aggregate.totalOutbound) : 0;

    // Threshold met status
    const initialThresholdMet = aggregate?.initialThresholdMet || 
      (initialThresholdAmount && totalCommitted >= initialThresholdAmount) ||
      false;

    // Progress calculations
    const fullAuthorizedProgress = fullAuthorizedAmount && fullAuthorizedAmount > 0
      ? Math.min(100, (totalCommitted / fullAuthorizedAmount) * 100)
      : aggregate?.fullAuthorizedProgress
        ? Number(aggregate.fullAuthorizedProgress)
        : 0;

    return NextResponse.json({
      // New fields
      initialThresholdEnabled,
      initialThresholdAmount,
      fullAuthorizedAmount,
      initialThresholdMet,
      fullAuthorizedProgress,
      // Aggregates
      totalCommitted,
      totalInbound,
      totalOutbound,
      // Legacy fields for backward compatibility
      thresholdEnabled: initialThresholdEnabled,
      thresholdAmount: initialThresholdAmount,
    });
  } catch (error: any) {
    console.error("Error fetching fund settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
