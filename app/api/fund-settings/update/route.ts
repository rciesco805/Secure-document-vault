import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      fundId, 
      initialThresholdEnabled, 
      initialThresholdAmount,
      fullAuthorizedAmount,
      // Legacy fields for backward compatibility
      thresholdEnabled, 
      thresholdAmount 
    } = body;

    if (!fundId) {
      return NextResponse.json({ message: "Fund ID required" }, { status: 400 });
    }

    const effectiveThresholdEnabled = initialThresholdEnabled ?? thresholdEnabled;
    const effectiveThresholdAmount = initialThresholdAmount ?? thresholdAmount;

    if (effectiveThresholdEnabled && (!effectiveThresholdAmount || effectiveThresholdAmount <= 0)) {
      return NextResponse.json(
        { message: "Initial threshold amount must be greater than 0 when enabled" },
        { status: 400 }
      );
    }

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

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    const auditEntry = {
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      action: "UPDATE_THRESHOLD_SETTINGS",
      userId: user.id,
      previousValue: {
        initialThresholdEnabled: fund.initialThresholdEnabled || fund.aggregate?.initialThresholdEnabled || false,
        initialThresholdAmount: fund.initialThresholdAmount 
          ? Number(fund.initialThresholdAmount)
          : fund.aggregate?.initialThresholdAmount 
            ? Number(fund.aggregate.initialThresholdAmount) 
            : null,
        fullAuthorizedAmount: fund.fullAuthorizedAmount 
          ? Number(fund.fullAuthorizedAmount) 
          : fund.aggregate?.fullAuthorizedAmount
            ? Number(fund.aggregate.fullAuthorizedAmount)
            : null,
      },
      newValue: {
        initialThresholdEnabled: effectiveThresholdEnabled,
        initialThresholdAmount: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
        fullAuthorizedAmount: fullAuthorizedAmount || null,
      },
    };

    // Update Fund model with new threshold fields
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        initialThresholdEnabled: effectiveThresholdEnabled,
        initialThresholdAmount: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
        fullAuthorizedAmount: fullAuthorizedAmount || null,
        // Keep legacy fields in sync
        capitalCallThresholdEnabled: effectiveThresholdEnabled,
        capitalCallThreshold: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
      },
    });

    const existingAudit = (fund.aggregate?.audit as any[]) || [];

    // Update or create FundAggregate
    if (fund.aggregate) {
      await prisma.fundAggregate.update({
        where: { id: fund.aggregate.id },
        data: {
          initialThresholdEnabled: effectiveThresholdEnabled,
          initialThresholdAmount: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
          fullAuthorizedAmount: fullAuthorizedAmount || null,
          // Keep legacy fields in sync
          thresholdEnabled: effectiveThresholdEnabled,
          thresholdAmount: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
          audit: [...existingAudit, auditEntry],
        },
      });
    } else {
      await prisma.fundAggregate.create({
        data: {
          fundId,
          initialThresholdEnabled: effectiveThresholdEnabled,
          initialThresholdAmount: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
          fullAuthorizedAmount: fullAuthorizedAmount || null,
          thresholdEnabled: effectiveThresholdEnabled,
          thresholdAmount: effectiveThresholdEnabled ? effectiveThresholdAmount : null,
          audit: [auditEntry],
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        eventType: "FUND_THRESHOLD_UPDATE",
        userId: user.id,
        teamId: fund.teamId,
        resourceType: "FUND",
        resourceId: fundId,
        ipAddress: ip,
        userAgent,
        metadata: auditEntry,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating fund settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
