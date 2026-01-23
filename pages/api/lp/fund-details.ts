import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { getFile } from "@/lib/files/get-file";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        investorProfile: {
          include: {
            investments: {
              include: {
                fund: {
                  include: {
                    aggregate: true,
                    distributions: {
                      orderBy: { distributionDate: "desc" },
                      take: 5,
                    },
                    capitalCalls: {
                      orderBy: { dueDate: "desc" },
                      take: 5,
                    },
                    reports: {
                      orderBy: { createdAt: "desc" },
                      take: 5,
                    },
                  },
                },
              },
            },
            capitalCalls: {
              include: {
                capitalCall: {
                  include: { fund: true },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            documents: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            notes: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                team: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    const investorProfile = user.investorProfile;

    const funds = investorProfile.investments.map((inv) => {
      const fund = inv.fund;
      const aggregate = fund.aggregate;
      
      const commitmentAmount = parseFloat(inv.commitmentAmount.toString());
      const fundedAmount = parseFloat(inv.fundedAmount.toString());
      const fundedPercentage = commitmentAmount > 0 
        ? Math.round((fundedAmount / commitmentAmount) * 100)
        : 0;

      const totalCommitted = aggregate 
        ? parseFloat(aggregate.totalCommitted.toString())
        : 0;
      const initialThresholdAmount = aggregate?.initialThresholdAmount
        ? parseFloat(aggregate.initialThresholdAmount.toString())
        : 0;
      const thresholdProgress = initialThresholdAmount > 0
        ? Math.min(100, Math.round((totalCommitted / initialThresholdAmount) * 100))
        : 100;

      return {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        style: fund.style,
        investment: {
          id: inv.id,
          commitmentAmount: commitmentAmount,
          fundedAmount: fundedAmount,
          fundedPercentage,
          status: inv.status,
          subscriptionDate: inv.subscriptionDate?.toISOString() || null,
        },
        metrics: {
          targetRaise: parseFloat(fund.targetRaise.toString()),
          currentRaise: parseFloat(fund.currentRaise.toString()),
          raiseProgress: parseFloat(fund.targetRaise.toString()) > 0
            ? Math.round((parseFloat(fund.currentRaise.toString()) / parseFloat(fund.targetRaise.toString())) * 100)
            : 0,
          totalCommitted,
          initialThresholdMet: aggregate?.initialThresholdMet || false,
          thresholdProgress,
        },
        recentDistributions: fund.distributions.map((d) => ({
          id: d.id,
          number: d.distributionNumber,
          amount: parseFloat(d.totalAmount.toString()),
          type: d.distributionType,
          date: d.distributionDate.toISOString(),
          status: d.status,
        })),
        recentCapitalCalls: fund.capitalCalls.map((cc) => ({
          id: cc.id,
          number: cc.callNumber,
          amount: parseFloat(cc.amount.toString()),
          purpose: cc.purpose,
          dueDate: cc.dueDate.toISOString(),
          status: cc.status,
        })),
        reports: fund.reports.map((r) => ({
          id: r.id,
          type: r.reportType,
          period: r.reportPeriod,
          title: r.title,
          fileUrl: r.fileUrl,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    });

    const pendingCapitalCalls = investorProfile.capitalCalls
      .filter((ccr) => ccr.status === "PENDING")
      .map((ccr) => ({
        id: ccr.id,
        callNumber: ccr.capitalCall.callNumber,
        amountDue: parseFloat(ccr.amountDue.toString()),
        amountPaid: parseFloat(ccr.amountPaid.toString()),
        dueDate: ccr.capitalCall.dueDate.toISOString(),
        fundName: ccr.capitalCall.fund.name,
        fundId: ccr.capitalCall.fund.id,
        status: ccr.status,
      }));

    const recentTransactions = investorProfile.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount.toString()),
      status: tx.status,
      description: tx.description,
      initiatedAt: tx.initiatedAt.toISOString(),
      completedAt: tx.completedAt?.toISOString() || null,
    }));

    const documents = await Promise.all(
      investorProfile.documents.map(async (doc) => {
        let fileUrl = null;
        try {
          if (doc.storageKey) {
            fileUrl = await getFile({
              type: doc.storageType as any,
              data: doc.storageKey,
            });
          }
        } catch (err) {
          console.error("Error getting document URL:", err);
        }
        return {
          id: doc.id,
          title: doc.title,
          documentType: doc.documentType,
          fileUrl,
          signedAt: doc.signedAt?.toISOString() || null,
          createdAt: doc.createdAt.toISOString(),
        };
      })
    );

    const notes = investorProfile.notes.map((note) => ({
      id: note.id,
      content: note.content,
      isFromInvestor: note.isFromInvestor,
      teamName: note.team.name,
      createdAt: note.createdAt.toISOString(),
    }));

    const totalCommitment = investorProfile.investments.reduce(
      (sum, inv) => sum + parseFloat(inv.commitmentAmount.toString()),
      0
    );
    const totalFunded = investorProfile.investments.reduce(
      (sum, inv) => sum + parseFloat(inv.fundedAmount.toString()),
      0
    );
    const totalDistributions = recentTransactions
      .filter((tx) => tx.type === "DISTRIBUTION" && tx.status === "COMPLETED")
      .reduce((sum, tx) => sum + tx.amount, 0);

    return res.status(200).json({
      summary: {
        totalCommitment,
        totalFunded,
        totalDistributions,
        activeFunds: funds.filter((f) => f.status === "RAISING" || f.status === "ACTIVE").length,
        pendingCapitalCallsCount: pendingCapitalCalls.length,
        pendingCapitalCallsTotal: pendingCapitalCalls.reduce((sum, cc) => sum + cc.amountDue, 0),
      },
      funds,
      pendingCapitalCalls,
      recentTransactions,
      documents,
      notes,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("LP fund-details error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
