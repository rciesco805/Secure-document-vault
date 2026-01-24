import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🧪 BF Fund Platform - Test Data Seeding");
  console.log("========================================\n");

  const args = process.argv.slice(2);
  const cleanFirst = args.includes("--clean");

  if (cleanFirst) {
    console.log("⚠️  Cleaning existing test data...");
    await cleanTestData();
  }

  console.log("📊 Creating test data for functional stress test...\n");

  const testAdminEmail = "test-admin@bffund.test";
  const testLpEmail = "test-lp@bffund.test";
  const testViewerEmail = "test-viewer@bffund.test";

  let adminUser = await prisma.user.findUnique({ where: { email: testAdminEmail } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        name: "Test Admin GP",
        emailVerified: new Date(),
      },
    });
    console.log(`✓ Created Admin/GP user: ${adminUser.email}`);
  } else {
    console.log(`○ Admin/GP user exists: ${adminUser.email}`);
  }

  let lpUser = await prisma.user.findUnique({ where: { email: testLpEmail } });
  if (!lpUser) {
    lpUser = await prisma.user.create({
      data: {
        email: testLpEmail,
        name: "Test LP Investor",
        emailVerified: new Date(),
      },
    });
    console.log(`✓ Created LP user: ${lpUser.email}`);
  } else {
    console.log(`○ LP user exists: ${lpUser.email}`);
  }

  let viewerUser = await prisma.user.findUnique({ where: { email: testViewerEmail } });
  if (!viewerUser) {
    viewerUser = await prisma.user.create({
      data: {
        email: testViewerEmail,
        name: "Test Viewer",
        emailVerified: new Date(),
      },
    });
    console.log(`✓ Created Viewer user: ${viewerUser.email}`);
  } else {
    console.log(`○ Viewer user exists: ${viewerUser.email}`);
  }

  let team = await prisma.team.findFirst({ where: { name: "Test Fund Team" } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Test Fund Team",
        users: {
          create: {
            userId: adminUser.id,
            role: "ADMIN",
            hasFundroomAccess: true,
          },
        },
      },
    });
    console.log(`✓ Created Team: ${team.name}`);
  } else {
    console.log(`○ Team exists: ${team.name}`);
    const existingMembership = await prisma.userTeam.findFirst({
      where: { teamId: team.id, userId: adminUser.id },
    });
    if (!existingMembership) {
      await prisma.userTeam.create({
        data: { teamId: team.id, userId: adminUser.id, role: "ADMIN", hasFundroomAccess: true },
      });
    }
  }

  let fund = await prisma.fund.findFirst({ where: { teamId: team.id, name: "Test Venture Fund I" } });
  if (!fund) {
    fund = await prisma.fund.create({
      data: {
        teamId: team.id,
        name: "Test Venture Fund I",
        description: "A test venture fund for functional stress testing",
        targetRaise: new Decimal(10000000),
        minimumInvestment: new Decimal(50000),
        currentRaise: new Decimal(0),
        status: "RAISING",
        ndaGateEnabled: true,
        initialThresholdEnabled: true,
        initialThresholdAmount: new Decimal(1800000),
        fullAuthorizedAmount: new Decimal(10000000),
        entityMode: "FUND",
      },
    });
    console.log(`✓ Created Fund: ${fund.name}`);
  } else {
    console.log(`○ Fund exists: ${fund.name}`);
  }

  await prisma.fundPricingTier.deleteMany({ where: { fundId: fund.id } });
  await prisma.fundPricingTier.createMany({
    data: [
      { fundId: fund.id, tranche: 1, unitsAvailable: 100, unitsTotal: 100, pricePerUnit: 10000 },
      { fundId: fund.id, tranche: 2, unitsAvailable: 100, unitsTotal: 100, pricePerUnit: 12500 },
      { fundId: fund.id, tranche: 3, unitsAvailable: 100, unitsTotal: 100, pricePerUnit: 15000 },
    ],
  });
  console.log(`✓ Created 3 pricing tiers for fund`);

  let investor = await prisma.investor.findUnique({ where: { userId: lpUser.id } });
  if (!investor) {
    investor = await prisma.investor.create({
      data: {
        userId: lpUser.id,
        fundId: fund.id,
        entityName: "Test LP Holdings LLC",
        entityType: "LLC",
        accreditationStatus: "SELF_CERTIFIED",
        accreditationType: "INCOME",
        ndaSigned: true,
        ndaSignedAt: new Date(),
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
        personaStatus: "APPROVED",
        personaVerifiedAt: new Date(),
      },
    });
    console.log(`✓ Created Investor: ${investor.entityName}`);
  } else {
    console.log(`○ Investor exists: ${investor.entityName}`);
  }

  let pendingInvestor = await prisma.investor.findFirst({
    where: { user: { email: "test-pending-lp@bffund.test" } },
  });
  if (!pendingInvestor) {
    const pendingUser = await prisma.user.create({
      data: {
        email: "test-pending-lp@bffund.test",
        name: "Test Pending LP",
        emailVerified: new Date(),
      },
    });
    pendingInvestor = await prisma.investor.create({
      data: {
        userId: pendingUser.id,
        fundId: fund.id,
        entityName: "Pending Investor Trust",
        entityType: "TRUST",
        accreditationStatus: "PENDING",
        ndaSigned: false,
        onboardingStep: 1,
        personaStatus: "NOT_STARTED",
      },
    });
    console.log(`✓ Created Pending Investor: ${pendingInvestor.entityName}`);
  } else {
    console.log(`○ Pending Investor exists: ${pendingInvestor.entityName}`);
  }

  let dataroom = await prisma.dataroom.findFirst({ where: { teamId: team.id, name: "Test PPM Dataroom" } });
  if (!dataroom) {
    dataroom = await prisma.dataroom.create({
      data: {
        teamId: team.id,
        pId: `test-dr-${randomBytes(4).toString("hex")}`,
        name: "Test PPM Dataroom",
      },
    });
    console.log(`✓ Created Dataroom: ${dataroom.name}`);
  } else {
    console.log(`○ Dataroom exists: ${dataroom.name}`);
  }

  let link = await prisma.link.findFirst({ where: { dataroomId: dataroom.id } });
  if (!link) {
    link = await prisma.link.create({
      data: {
        dataroomId: dataroom.id,
        slug: `test-link-${randomBytes(4).toString("hex")}`,
        name: "Test Dataroom Link",
        emailProtected: false,
        allowDownload: true,
      },
    });
    console.log(`✓ Created Link: ${link.slug}`);
  } else {
    console.log(`○ Link exists: ${link.slug}`);
  }

  let document = await prisma.document.findFirst({ where: { teamId: team.id, name: "Test NDA Document" } });
  if (!document) {
    document = await prisma.document.create({
      data: {
        teamId: team.id,
        name: "Test NDA Document",
        contentType: "application/pdf",
        type: "pdf",
        numPages: 3,
        file: "test-nda.pdf",
      },
    });
    console.log(`✓ Created Document: ${document.name}`);
  } else {
    console.log(`○ Document exists: ${document.name}`);
  }

  let signatureDoc = await prisma.signatureDocument.findFirst({
    where: { teamId: team.id, title: "Test Subscription Agreement" },
  });
  if (!signatureDoc) {
    signatureDoc = await prisma.signatureDocument.create({
      data: {
        teamId: team.id,
        createdById: adminUser.id,
        title: "Test Subscription Agreement",
        description: "A test subscription agreement for functional testing",
        status: "DRAFT",
        file: "test-subscription.pdf",
        numPages: 5,
      },
    });
    console.log(`✓ Created Signature Document: ${signatureDoc.title}`);
  } else {
    console.log(`○ Signature Document exists: ${signatureDoc.title}`);
  }

  let subscription = await prisma.subscription.findFirst({
    where: { investorId: investor.id, fundId: fund.id },
  });
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        investorId: investor.id,
        fundId: fund.id,
        signatureDocumentId: signatureDoc.id,
        amount: new Decimal(100000),
        units: 10,
        status: "COMMITTED",
        signedAt: new Date(),
        tierBreakdown: JSON.stringify([{ tier: 1, units: 10, pricePerUnit: 10000, subtotal: 100000 }]),
        ipAddress: "127.0.0.1",
        userAgent: "Test-Agent/1.0",
      },
    });
    console.log(`✓ Created Subscription: $${subscription.amount.toString()}`);
  } else {
    console.log(`○ Subscription exists: $${subscription.amount.toString()}`);
  }

  let investment = await prisma.investment.findFirst({
    where: { investorId: investor.id, fundId: fund.id },
  });
  if (!investment) {
    investment = await prisma.investment.create({
      data: {
        investorId: investor.id,
        fundId: fund.id,
        commitmentAmount: new Decimal(100000),
        fundedAmount: new Decimal(25000),
        status: "COMMITTED",
      },
    });
    console.log(`✓ Created Investment: $${investment.commitmentAmount.toString()}`);
  } else {
    console.log(`○ Investment exists: $${investment.commitmentAmount.toString()}`);
  }

  let fundAggregate = await prisma.fundAggregate.findFirst({ where: { fundId: fund.id } });
  if (!fundAggregate) {
    fundAggregate = await prisma.fundAggregate.create({
      data: {
        fundId: fund.id,
        totalCommitted: 100000,
        totalInbound: 25000,
        totalOutbound: 0,
        initialThresholdEnabled: true,
        initialThresholdAmount: 1800000,
        initialThresholdMet: false,
        fullAuthorizedAmount: 10000000,
        fullAuthorizedProgress: 1.0,
      },
    });
    console.log(`✓ Created Fund Aggregate`);
  } else {
    console.log(`○ Fund Aggregate exists`);
  }

  await prisma.accreditationAck.deleteMany({ where: { investorId: investor.id } });
  await prisma.accreditationAck.create({
    data: {
      investorId: investor.id,
      acknowledged: true,
      method: "SELF_CERTIFIED",
      accreditationType: "INCOME",
      confirmAccredited: true,
      confirmRiskAware: true,
      confirmDocReview: true,
      confirmRepresentations: true,
      ipAddress: "127.0.0.1",
      userAgent: "Test-Agent/1.0",
      sessionId: randomBytes(16).toString("hex"),
      completedAt: new Date(),
    },
  });
  console.log(`✓ Created Accreditation Acknowledgment`);

  console.log("\n========================================");
  console.log("✅ Test data seeding complete!\n");

  console.log("📋 Test Accounts Summary:");
  console.log(`   Admin/GP:  ${testAdminEmail}`);
  console.log(`   LP:        ${testLpEmail}`);
  console.log(`   Viewer:    ${testViewerEmail}`);
  console.log(`   Pending:   test-pending-lp@bffund.test`);
  console.log(`\n   Team:      ${team.name}`);
  console.log(`   Fund:      ${fund.name}`);
  console.log(`   Dataroom:  ${dataroom.name}`);
  console.log(`   Link:      /view/${link.id}\n`);
}

async function cleanTestData() {
  const testEmails = [
    "test-admin@bffund.test",
    "test-lp@bffund.test",
    "test-viewer@bffund.test",
    "test-pending-lp@bffund.test",
  ];

  const testUsers = await prisma.user.findMany({ where: { email: { in: testEmails } } });
  const testUserIds = testUsers.map((u) => u.id);

  await prisma.accreditationAck.deleteMany({ where: { investor: { userId: { in: testUserIds } } } });
  await prisma.subscription.deleteMany({ where: { investorId: { in: (await prisma.investor.findMany({ where: { userId: { in: testUserIds } }, select: { id: true } })).map(i => i.id) } } });
  await prisma.investment.deleteMany({ where: { investor: { userId: { in: testUserIds } } } });
  await prisma.investor.deleteMany({ where: { userId: { in: testUserIds } } });
  await prisma.signatureDocument.deleteMany({ where: { team: { name: "Test Fund Team" } } });
  await prisma.document.deleteMany({ where: { team: { name: "Test Fund Team" } } });
  await prisma.link.deleteMany({ where: { dataroom: { team: { name: "Test Fund Team" } } } });
  await prisma.dataroom.deleteMany({ where: { team: { name: "Test Fund Team" } } });
  await prisma.fundPricingTier.deleteMany({ where: { fund: { team: { name: "Test Fund Team" } } } });
  await prisma.fundAggregate.deleteMany({ where: { fund: { team: { name: "Test Fund Team" } } } });
  await prisma.fund.deleteMany({ where: { team: { name: "Test Fund Team" } } });
  await prisma.userTeam.deleteMany({ where: { team: { name: "Test Fund Team" } } });
  await prisma.team.deleteMany({ where: { name: "Test Fund Team" } });
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

  console.log("✓ Cleaned test data");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding test data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
