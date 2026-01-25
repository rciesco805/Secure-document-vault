import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { role: { in: ["ADMIN", "OWNER"] } },
          include: {
            team: {
              include: {
                funds: {
                  include: {
                    aggregate: true,
                    _count: {
                      select: { investments: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const funds = user.teams.flatMap((ut) =>
      ut.team.funds.map((fund) => ({
        id: fund.id,
        name: fund.name,
        status: fund.status,
        targetRaise: Number(fund.targetRaise),
        currentRaise: Number(fund.currentRaise),
        investorCount: fund._count.investments,
        aggregate: fund.aggregate
          ? {
              thresholdEnabled: fund.aggregate.thresholdEnabled,
              thresholdAmount: fund.aggregate.thresholdAmount
                ? Number(fund.aggregate.thresholdAmount)
                : null,
              totalCommitted: Number(fund.aggregate.totalCommitted),
              totalInbound: Number(fund.aggregate.totalInbound),
              totalOutbound: Number(fund.aggregate.totalOutbound),
            }
          : null,
      }))
    );

    return NextResponse.json({ funds });
  } catch (error: any) {
    console.error("Error fetching funds:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
