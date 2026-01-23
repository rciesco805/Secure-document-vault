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
    const { fundId, thresholdEnabled, thresholdAmount } = body;

    if (!fundId) {
      return NextResponse.json({ message: "Fund ID required" }, { status: 400 });
    }

    if (thresholdEnabled && (!thresholdAmount || thresholdAmount <= 0)) {
      return NextResponse.json(
        { message: "Threshold amount must be greater than 0 when enabled" },
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
      action: "UPDATE_THRESHOLD",
      userId: user.id,
      previousValue: {
        thresholdEnabled: fund.aggregate?.thresholdEnabled || false,
        thresholdAmount: fund.aggregate?.thresholdAmount
          ? Number(fund.aggregate.thresholdAmount)
          : null,
      },
      newValue: {
        thresholdEnabled,
        thresholdAmount: thresholdEnabled ? thresholdAmount : null,
      },
    };

    const existingAudit = (fund.aggregate?.audit as any[]) || [];

    if (fund.aggregate) {
      await prisma.fundAggregate.update({
        where: { id: fund.aggregate.id },
        data: {
          thresholdEnabled,
          thresholdAmount: thresholdEnabled ? thresholdAmount : null,
          audit: [...existingAudit, auditEntry],
        },
      });
    } else {
      await prisma.fundAggregate.create({
        data: {
          fundId,
          thresholdEnabled,
          thresholdAmount: thresholdEnabled ? thresholdAmount : null,
          audit: [auditEntry],
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        eventType: "FUND_AGGREGATE_UPDATE",
        userId: user.id,
        teamId: fund.teamId,
        resourceType: "FUND_AGGREGATE",
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
