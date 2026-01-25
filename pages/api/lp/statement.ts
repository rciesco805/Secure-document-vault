import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { authOptions } from "@/lib/auth/auth-options";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = session.user as CustomUser;
  const { period, year, format } = req.query;

  const investor = await prisma.investor.findUnique({
    where: { userId: user.id },
    include: {
      fund: {
        include: {
          aggregate: true,
        },
      },
      investments: true,
      transactions: {
        orderBy: { createdAt: "desc" },
      },
      bankLinks: {
        where: { status: "ACTIVE" },
        select: {
          accountName: true,
          institutionName: true,
          accountMask: true,
        },
      },
    },
  });

  if (!investor) {
    return res.status(404).json({ error: "Investor not found" });
  }

  const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();
  const selectedPeriod = (period as string) || "annual";

  const startDate = new Date(selectedYear, 0, 1);
  const endDate = selectedPeriod === "annual"
    ? new Date(selectedYear, 11, 31, 23, 59, 59)
    : selectedPeriod === "Q1"
    ? new Date(selectedYear, 2, 31, 23, 59, 59)
    : selectedPeriod === "Q2"
    ? new Date(selectedYear, 5, 30, 23, 59, 59)
    : selectedPeriod === "Q3"
    ? new Date(selectedYear, 8, 30, 23, 59, 59)
    : new Date(selectedYear, 11, 31, 23, 59, 59);

  const periodStartDate = selectedPeriod === "annual"
    ? startDate
    : selectedPeriod === "Q1"
    ? new Date(selectedYear, 0, 1)
    : selectedPeriod === "Q2"
    ? new Date(selectedYear, 3, 1)
    : selectedPeriod === "Q3"
    ? new Date(selectedYear, 6, 1)
    : new Date(selectedYear, 9, 1);

  const periodTransactions = investor.transactions.filter(
    (t) =>
      new Date(t.createdAt) >= periodStartDate &&
      new Date(t.createdAt) <= endDate
  );

  const capitalCalls = periodTransactions.filter((t) => t.type === "CAPITAL_CALL");
  const distributions = periodTransactions.filter((t) => t.type === "DISTRIBUTION");

  const totalCommitment = investor.investments.reduce(
    (sum, inv) => sum + Number(inv.commitmentAmount),
    0
  );
  const totalFunded = investor.investments.reduce(
    (sum, inv) => sum + Number(inv.fundedAmount),
    0
  );
  const unfundedCommitment = totalCommitment - totalFunded;

  const periodCapitalCalls = capitalCalls.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );
  const periodDistributions = distributions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const allTimeCapitalCalls = investor.transactions
    .filter((t) => t.type === "CAPITAL_CALL" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const allTimeDistributions = investor.transactions
    .filter((t) => t.type === "DISTRIBUTION" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netCapitalAccount = allTimeCapitalCalls - allTimeDistributions;

  const statement = {
    investor: {
      name: investor.entityName || user.name || user.email,
      entityType: investor.entityType,
      id: investor.id,
      email: user.email,
    },
    fund: investor.fund
      ? {
          name: investor.fund.name,
          status: investor.fund.status,
          targetRaise: Number(investor.fund.targetRaise),
          currentRaise: Number(investor.fund.currentRaise),
        }
      : null,
    period: {
      type: selectedPeriod,
      year: selectedYear,
      startDate: periodStartDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    capitalAccount: {
      totalCommitment,
      totalFunded,
      unfundedCommitment,
      netCapitalAccount,
      ownershipPercentage: investor.fund
        ? Number(investor.fund.currentRaise) > 0
          ? ((totalFunded / Number(investor.fund.currentRaise)) * 100).toFixed(2)
          : "0.00"
        : "0.00",
    },
    periodActivity: {
      capitalCalls: periodCapitalCalls,
      distributions: periodDistributions,
      netActivity: periodCapitalCalls - periodDistributions,
      transactionCount: periodTransactions.length,
    },
    transactions: periodTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      date: t.createdAt,
      description: t.description,
    })),
    bankAccount: investor.bankLinks[0]
      ? {
          institution: investor.bankLinks[0].institutionName,
          accountName: investor.bankLinks[0].accountName,
          lastFour: investor.bankLinks[0].accountMask,
        }
      : null,
    k1Status: {
      available: false,
      year: selectedYear,
      estimatedDate: new Date(selectedYear + 1, 2, 15).toISOString(),
    },
    generatedAt: new Date().toISOString(),
    statementId: `STMT-${investor.id.slice(-8).toUpperCase()}-${selectedYear}-${selectedPeriod}`,
  };

  if (format === "html") {
    const html = generateStatementHTML(statement);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  }

  return res.status(200).json(statement);
}

function generateStatementHTML(statement: any): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>LP Statement - ${statement.investor.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 40px; color: #111; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: #1a1a2e; color: white; padding: 32px; border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header p { opacity: 0.8; }
        .content { padding: 32px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #1a1a2e; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .stat-card { background: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
        .stat-label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
        .stat-value { font-size: 24px; font-weight: 600; color: #111; }
        .stat-value.positive { color: #10b981; }
        .stat-value.negative { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #6b7280; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .badge-green { background: #d1fae5; color: #065f46; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .footer { padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Limited Partner Statement</h1>
          <p>${statement.period.type === 'annual' ? 'Annual' : statement.period.type} Statement - ${statement.period.year}</p>
        </div>
        
        <div class="content">
          <div class="section">
            <div class="grid">
              <div>
                <p style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Investor</p>
                <p style="font-size: 18px; font-weight: 600;">${statement.investor.name}</p>
                <p style="color: #6b7280;">${statement.investor.entityType}</p>
              </div>
              <div>
                <p style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Fund</p>
                <p style="font-size: 18px; font-weight: 600;">${statement.fund?.name || 'N/A'}</p>
                <p style="color: #6b7280;">Statement ID: ${statement.statementId}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Capital Account Summary</h2>
            <div class="grid">
              <div class="stat-card">
                <div class="stat-label">Total Commitment</div>
                <div class="stat-value">${formatCurrency(statement.capitalAccount.totalCommitment)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Capital Contributed</div>
                <div class="stat-value">${formatCurrency(statement.capitalAccount.totalFunded)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Unfunded Commitment</div>
                <div class="stat-value">${formatCurrency(statement.capitalAccount.unfundedCommitment)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Ownership %</div>
                <div class="stat-value">${statement.capitalAccount.ownershipPercentage}%</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Period Activity (${formatDate(statement.period.startDate)} - ${formatDate(statement.period.endDate)})</h2>
            <div class="grid">
              <div class="stat-card">
                <div class="stat-label">Capital Calls</div>
                <div class="stat-value negative">${formatCurrency(statement.periodActivity.capitalCalls)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Distributions</div>
                <div class="stat-value positive">${formatCurrency(statement.periodActivity.distributions)}</div>
              </div>
            </div>
          </div>

          ${statement.transactions.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Transaction History</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${statement.transactions.map((t: any) => `
                  <tr>
                    <td>${formatDate(t.date)}</td>
                    <td><span class="badge ${t.type === 'DISTRIBUTION' ? 'badge-green' : 'badge-blue'}">${t.type.replace('_', ' ')}</span></td>
                    <td>${t.description || '-'}</td>
                    <td style="font-weight: 600; color: ${t.type === 'DISTRIBUTION' ? '#10b981' : '#111'};">${t.type === 'DISTRIBUTION' ? '+' : '-'}${formatCurrency(t.amount)}</td>
                    <td><span class="badge ${t.status === 'COMPLETED' ? 'badge-green' : 'badge-yellow'}">${t.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="section">
            <h2 class="section-title">Tax Information</h2>
            <div class="stat-card">
              <div class="stat-label">Schedule K-1 Status</div>
              <p style="margin-top: 8px; color: #6b7280;">
                ${statement.k1Status.available 
                  ? 'Your K-1 is available for download.' 
                  : `Your ${statement.k1Status.year} K-1 will be available by ${formatDate(statement.k1Status.estimatedDate)}.`}
              </p>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${formatDate(statement.generatedAt)} | Statement ID: ${statement.statementId}</p>
          <p style="margin-top: 8px;">This statement is for informational purposes only. Please consult your tax advisor for tax-related matters.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
