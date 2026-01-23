import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { fundId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { fundId } = params;

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

    const aggregate = fund.aggregate || {
      thresholdEnabled: false,
      thresholdAmount: null,
      totalCommitted: 0,
      totalInbound: 0,
      totalOutbound: 0,
    };

    return NextResponse.json({
      thresholdEnabled: aggregate.thresholdEnabled,
      thresholdAmount: aggregate.thresholdAmount
        ? Number(aggregate.thresholdAmount)
        : null,
      totalCommitted: Number(aggregate.totalCommitted || 0),
      totalInbound: Number(aggregate.totalInbound || 0),
      totalOutbound: Number(aggregate.totalOutbound || 0),
    });
  } catch (error: any) {
    console.error("Error fetching fund settings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
