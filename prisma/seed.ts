import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ImportData {
  metadata: {
    exportedAt: string;
    exportedBy: string;
    teamId: string;
    schemaVersion: string;
    modelCounts: Record<string, number>;
  };
  data: {
    funds?: any[];
    fundAggregates?: any[];
    investors?: any[];
    investments?: any[];
    capitalCalls?: any[];
    capitalCallResponses?: any[];
    distributions?: any[];
    fundReports?: any[];
    investorNotes?: any[];
    investorDocuments?: any[];
    accreditationAcks?: any[];
    bankLinks?: any[];
    transactions?: any[];
    subscriptions?: any[];
  };
}

async function main() {
  const args = process.argv.slice(2);
  const importFile = args.find((arg) => arg.startsWith("--file="))?.split("=")[1];
  const targetTeamId = args.find((arg) => arg.startsWith("--team="))?.split("=")[1];
  const dryRun = args.includes("--dry-run");

  if (!importFile) {
    console.log("Usage: npx ts-node prisma/seed.ts --file=<path-to-export.json> [--team=<teamId>] [--dry-run]");
    console.log("\nOptions:");
    console.log("  --file=<path>   Path to the export JSON file (required)");
    console.log("  --team=<id>     Target team ID (uses export teamId if not provided)");
    console.log("  --dry-run       Validate without making changes");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), importFile);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`\nReading import file: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const importData: ImportData = JSON.parse(fileContent);

  console.log("\n📋 Import Metadata:");
  console.log(`  - Exported At: ${importData.metadata.exportedAt}`);
  console.log(`  - Exported By: ${importData.metadata.exportedBy}`);
  console.log(`  - Source Team: ${importData.metadata.teamId}`);
  console.log(`  - Schema Version: ${importData.metadata.schemaVersion}`);

  const teamId = targetTeamId || importData.metadata.teamId;
  console.log(`\n🎯 Target Team: ${teamId}`);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    console.error(`\n❌ Team not found: ${teamId}`);
    process.exit(1);
  }
  console.log(`  - Team Name: ${team.name}`);

  if (dryRun) {
    console.log("\n⚠️  DRY RUN MODE - No changes will be made");
  }

  const results: Record<string, { created: number; skipped: number; errors: number }> = {};
  const idMappings: Record<string, Record<string, string>> = {
    funds: {},
    investors: {},
    capitalCalls: {},
    distributions: {},
  };

  if (importData.data.funds?.length) {
    console.log("\n📁 Importing Funds...");
    results.funds = { created: 0, skipped: 0, errors: 0 };

    for (const fund of importData.data.funds) {
      try {
        const existing = await prisma.fund.findFirst({
          where: { teamId, name: fund.name },
        });

        if (existing) {
          idMappings.funds[fund.id] = existing.id;
          results.funds.skipped++;
          continue;
        }

        if (!dryRun) {
          const created = await prisma.fund.create({
            data: {
              teamId,
              name: fund.name,
              description: fund.description,
              targetRaise: new Decimal(fund.targetRaise),
              minimumInvestment: new Decimal(fund.minimumInvestment),
              currentRaise: new Decimal(fund.currentRaise || 0),
              status: fund.status || "RAISING",
              closingDate: fund.closingDate ? new Date(fund.closingDate) : null,
              ndaGateEnabled: fund.ndaGateEnabled ?? true,
              // Threshold fields
              style: fund.style || null,
              aumTarget: fund.aumTarget ? new Decimal(fund.aumTarget) : null,
              callFrequency: fund.callFrequency || "AS_NEEDED",
              capitalCallThresholdEnabled: fund.capitalCallThresholdEnabled ?? false,
              capitalCallThreshold: fund.capitalCallThreshold ? new Decimal(fund.capitalCallThreshold) : null,
              stagedCommitmentsEnabled: fund.stagedCommitmentsEnabled ?? false,
              // New initial/full threshold fields
              initialThresholdEnabled: fund.initialThresholdEnabled ?? fund.capitalCallThresholdEnabled ?? false,
              initialThresholdAmount: fund.initialThresholdAmount 
                ? new Decimal(fund.initialThresholdAmount) 
                : fund.capitalCallThreshold 
                  ? new Decimal(fund.capitalCallThreshold) 
                  : null,
              fullAuthorizedAmount: fund.fullAuthorizedAmount ? new Decimal(fund.fullAuthorizedAmount) : null,
            },
          });
          idMappings.funds[fund.id] = created.id;
        }
        results.funds.created++;
      } catch (err: any) {
        console.error(`  Error importing fund ${fund.name}: ${err.message}`);
        results.funds.errors++;
      }
    }
    console.log(`  Created: ${results.funds.created}, Skipped: ${results.funds.skipped}, Errors: ${results.funds.errors}`);
  }

  if (importData.data.fundAggregates?.length) {
    console.log("\n📊 Importing Fund Aggregates...");
    results.fundAggregates = { created: 0, skipped: 0, errors: 0 };

    for (const agg of importData.data.fundAggregates) {
      try {
        const fundId = idMappings.funds[agg.fundId] || agg.fundId;
        
        const existing = await prisma.fundAggregate.findFirst({
          where: { fundId },
        });

        if (existing) {
          results.fundAggregates.skipped++;
          continue;
        }

        if (!dryRun) {
          await prisma.fundAggregate.create({
            data: {
              fundId,
              totalInbound: agg.totalInbound || 0,
              totalOutbound: agg.totalOutbound || 0,
              totalCommitted: agg.totalCommitted || 0,
              currentBalance: agg.currentBalance || null,
              thresholdEnabled: agg.thresholdEnabled ?? false,
              thresholdAmount: agg.thresholdAmount || null,
              // New initial/full threshold fields
              initialThresholdEnabled: agg.initialThresholdEnabled ?? agg.thresholdEnabled ?? false,
              initialThresholdAmount: agg.initialThresholdAmount || agg.thresholdAmount || null,
              initialThresholdMet: agg.initialThresholdMet ?? false,
              initialThresholdMetAt: agg.initialThresholdMetAt ? new Date(agg.initialThresholdMetAt) : null,
              fullAuthorizedAmount: agg.fullAuthorizedAmount || null,
              fullAuthorizedProgress: agg.fullAuthorizedProgress || 0,
              audit: agg.audit || null,
            },
          });
        }
        results.fundAggregates.created++;
      } catch (err: any) {
        console.error(`  Error importing fund aggregate: ${err.message}`);
        results.fundAggregates.errors++;
      }
    }
    console.log(`  Created: ${results.fundAggregates.created}, Skipped: ${results.fundAggregates.skipped}, Errors: ${results.fundAggregates.errors}`);
  }

  if (importData.data.investors?.length) {
    console.log("\n👤 Importing Investors...");
    results.investors = { created: 0, skipped: 0, errors: 0 };

    for (const investor of importData.data.investors) {
      try {
        const existingByUser = await prisma.investor.findUnique({
          where: { userId: investor.userId },
        });

        if (existingByUser) {
          idMappings.investors[investor.id] = existingByUser.id;
          results.investors.skipped++;
          continue;
        }

        const userExists = await prisma.user.findUnique({
          where: { id: investor.userId },
        });

        if (!userExists) {
          results.investors.skipped++;
          continue;
        }

        if (!dryRun) {
          const created = await prisma.investor.create({
            data: {
              userId: investor.userId,
              entityName: investor.entityName,
              entityType: investor.entityType || "INDIVIDUAL",
              taxId: investor.taxId,
              address: investor.address,
              phone: investor.phone,
              accreditationStatus: investor.accreditationStatus || "PENDING",
              accreditationType: investor.accreditationType,
              ndaSigned: investor.ndaSigned ?? false,
              onboardingStep: investor.onboardingStep || 0,
            },
          });
          idMappings.investors[investor.id] = created.id;
        }
        results.investors.created++;
      } catch (err: any) {
        console.error(`  Error importing investor: ${err.message}`);
        results.investors.errors++;
      }
    }
    console.log(`  Created: ${results.investors.created}, Skipped: ${results.investors.skipped}, Errors: ${results.investors.errors}`);
  }

  if (importData.data.investments?.length) {
    console.log("\n💰 Importing Investments...");
    results.investments = { created: 0, skipped: 0, errors: 0 };

    for (const investment of importData.data.investments) {
      try {
        const fundId = idMappings.funds[investment.fundId] || investment.fundId;
        const investorId = idMappings.investors[investment.investorId] || investment.investorId;

        const existing = await prisma.investment.findUnique({
          where: { fundId_investorId: { fundId, investorId } },
        });

        if (existing) {
          results.investments.skipped++;
          continue;
        }

        if (!dryRun) {
          await prisma.investment.create({
            data: {
              fundId,
              investorId,
              commitmentAmount: new Decimal(investment.commitmentAmount),
              fundedAmount: new Decimal(investment.fundedAmount || 0),
              status: investment.status || "COMMITTED",
              subscriptionDate: investment.subscriptionDate
                ? new Date(investment.subscriptionDate)
                : null,
            },
          });
        }
        results.investments.created++;
      } catch (err: any) {
        console.error(`  Error importing investment: ${err.message}`);
        results.investments.errors++;
      }
    }
    console.log(`  Created: ${results.investments.created}, Skipped: ${results.investments.skipped}, Errors: ${results.investments.errors}`);
  }

  if (importData.data.capitalCalls?.length) {
    console.log("\n📞 Importing Capital Calls...");
    results.capitalCalls = { created: 0, skipped: 0, errors: 0 };

    for (const call of importData.data.capitalCalls) {
      try {
        const fundId = idMappings.funds[call.fundId] || call.fundId;

        const existing = await prisma.capitalCall.findFirst({
          where: { fundId, callNumber: call.callNumber },
        });

        if (existing) {
          idMappings.capitalCalls[call.id] = existing.id;
          results.capitalCalls.skipped++;
          continue;
        }

        if (!dryRun) {
          const created = await prisma.capitalCall.create({
            data: {
              fundId,
              callNumber: call.callNumber,
              amount: new Decimal(call.amount),
              purpose: call.purpose,
              dueDate: new Date(call.dueDate),
              status: call.status || "PENDING",
            },
          });
          idMappings.capitalCalls[call.id] = created.id;
        }
        results.capitalCalls.created++;
      } catch (err: any) {
        console.error(`  Error importing capital call: ${err.message}`);
        results.capitalCalls.errors++;
      }
    }
    console.log(`  Created: ${results.capitalCalls.created}, Skipped: ${results.capitalCalls.skipped}, Errors: ${results.capitalCalls.errors}`);
  }

  if (importData.data.distributions?.length) {
    console.log("\n💸 Importing Distributions...");
    results.distributions = { created: 0, skipped: 0, errors: 0 };

    for (const dist of importData.data.distributions) {
      try {
        const fundId = idMappings.funds[dist.fundId] || dist.fundId;

        const existing = await prisma.distribution.findFirst({
          where: { fundId, distributionNumber: dist.distributionNumber },
        });

        if (existing) {
          idMappings.distributions[dist.id] = existing.id;
          results.distributions.skipped++;
          continue;
        }

        if (!dryRun) {
          const created = await prisma.distribution.create({
            data: {
              fundId,
              distributionNumber: dist.distributionNumber,
              totalAmount: new Decimal(dist.totalAmount),
              distributionType: dist.distributionType || "DIVIDEND",
              distributionDate: new Date(dist.distributionDate),
              status: dist.status || "PENDING",
            },
          });
          idMappings.distributions[dist.id] = created.id;
        }
        results.distributions.created++;
      } catch (err: any) {
        console.error(`  Error importing distribution: ${err.message}`);
        results.distributions.errors++;
      }
    }
    console.log(`  Created: ${results.distributions.created}, Skipped: ${results.distributions.skipped}, Errors: ${results.distributions.errors}`);
  }

  if (importData.data.transactions?.length) {
    console.log("\n🧾 Importing Transactions...");
    results.transactions = { created: 0, skipped: 0, errors: 0 };

    for (const tx of importData.data.transactions) {
      try {
        const investorId = idMappings.investors[tx.investorId] || tx.investorId;

        if (!dryRun) {
          await prisma.transaction.create({
            data: {
              investorId,
              type: tx.type,
              amount: new Decimal(tx.amount),
              currency: tx.currency || "USD",
              description: tx.description,
              capitalCallId: tx.capitalCallId
                ? idMappings.capitalCalls[tx.capitalCallId] || tx.capitalCallId
                : null,
              distributionId: tx.distributionId
                ? idMappings.distributions[tx.distributionId] || tx.distributionId
                : null,
              fundId: tx.fundId ? idMappings.funds[tx.fundId] || tx.fundId : null,
              status: tx.status || "PENDING",
              statusMessage: tx.statusMessage,
            },
          });
        }
        results.transactions.created++;
      } catch (err: any) {
        console.error(`  Error importing transaction: ${err.message}`);
        results.transactions.errors++;
      }
    }
    console.log(`  Created: ${results.transactions.created}, Skipped: ${results.transactions.skipped}, Errors: ${results.transactions.errors}`);
  }

  console.log("\n✅ Import Complete!");
  console.log("\n📊 Summary:");
  for (const [model, counts] of Object.entries(results)) {
    console.log(`  ${model}: ${counts.created} created, ${counts.skipped} skipped, ${counts.errors} errors`);
  }

  if (dryRun) {
    console.log("\n⚠️  This was a dry run. Run without --dry-run to apply changes.");
  }
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
