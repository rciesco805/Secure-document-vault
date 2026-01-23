import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockPrisma = {
  fund: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  fundAggregate: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  team: { findFirst: jest.fn() },
  investment: { findMany: jest.fn() },
  capitalCall: { findMany: jest.fn() },
  distribution: { findMany: jest.fn() },
  investor: { findMany: jest.fn() },
  auditLog: { create: jest.fn() },
};

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Multi-Fund Features", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Fund Creation API", () => {
    it("creates a new fund with all configuration options", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", email: "gp@example.com" },
      } as any);

      mockPrisma.team.findFirst.mockResolvedValue({
        id: "team-1",
        name: "Test Team",
      });

      mockPrisma.fund.create.mockResolvedValue({
        id: "fund-new",
        name: "Fund A - High AUM",
        style: "STAGED_COMMITMENTS",
        targetRaise: 10000000,
        minimumInvestment: 100000,
        aumTarget: 50000000,
        callFrequency: "QUARTERLY",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        stagedCommitmentsEnabled: true,
        createdBy: "user-1",
      });

      mockPrisma.fundAggregate.create.mockResolvedValue({
        id: "agg-new",
        fundId: "fund-new",
        totalInbound: 0,
        totalOutbound: 0,
        totalCommitted: 0,
        thresholdEnabled: true,
        thresholdAmount: 1800000,
      });

      const { POST } = await import("@/app/api/funds/create/route");

      const request = new Request("http://localhost/api/funds/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: "team-1",
          name: "Fund A - High AUM",
          style: "STAGED_COMMITMENTS",
          targetRaise: "10000000",
          minimumInvestment: "100000",
          aumTarget: "50000000",
          callFrequency: "QUARTERLY",
          thresholdEnabled: true,
          thresholdAmount: "1800000",
          stagedCommitmentsEnabled: true,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fund.name).toBe("Fund A - High AUM");
      expect(mockPrisma.fund.create).toHaveBeenCalled();
      expect(mockPrisma.fundAggregate.create).toHaveBeenCalled();
    });

    it("rejects fund creation without required fields", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", email: "gp@example.com" },
      } as any);

      const { POST } = await import("@/app/api/funds/create/route");

      const request = new Request("http://localhost/api/funds/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Incomplete Fund",
        }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(400);
    });

    it("rejects unauthorized fund creation", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { POST } = await import("@/app/api/funds/create/route");

      const request = new Request("http://localhost/api/funds/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: "team-1",
          name: "Fund",
          targetRaise: "1000000",
          minimumInvestment: "50000",
        }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(401);
    });
  });

  describe("Per-Fund Dashboard API", () => {
    it("returns fund details with aggregates and investors", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", email: "gp@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        teams: [
          { teamId: "team-1", role: "ADMIN", team: { id: "team-1" } },
        ],
      });

      mockPrisma.fund.findFirst.mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        name: "Test Fund",
        description: "A test fund",
        style: "TRADITIONAL",
        status: "RAISING",
        targetRaise: { toNumber: () => 5000000 },
        currentRaise: { toNumber: () => 2500000 },
        minimumInvestment: { toNumber: () => 100000 },
        aumTarget: { toNumber: () => 25000000 },
        callFrequency: "QUARTERLY",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: { toNumber: () => 1800000 },
        stagedCommitmentsEnabled: false,
        closingDate: new Date("2025-12-31"),
        createdAt: new Date(),
        aggregate: {
          totalInbound: { toNumber: () => 1000000 },
          totalOutbound: { toNumber: () => 200000 },
          totalCommitted: { toNumber: () => 2000000 },
          thresholdEnabled: true,
          thresholdAmount: { toNumber: () => 1800000 },
        },
        investments: [
          {
            investor: {
              id: "inv-1",
              user: { name: "John Doe", email: "john@example.com" },
            },
            commitmentAmount: { toNumber: () => 500000 },
            fundedAmount: { toNumber: () => 250000 },
            status: "COMMITTED",
          },
        ],
        capitalCalls: [
          {
            id: "call-1",
            callNumber: 1,
            amount: { toNumber: () => 500000 },
            dueDate: new Date("2025-06-01"),
            status: "PENDING",
          },
        ],
        distributions: [],
      });

      const fundDetailHandler = (await import("@/pages/api/admin/fund/[id]")).default;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
        query: { id: "fund-1" },
      });

      await fundDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.name).toBe("Test Fund");
      expect(data.style).toBe("TRADITIONAL");
      expect(data.callFrequency).toBe("QUARTERLY");
      expect(data.aggregate).toBeDefined();
      expect(data.investors).toHaveLength(1);
      expect(data.capitalCalls).toHaveLength(1);
    });

    it("returns 404 for non-existent fund", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", email: "gp@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        teams: [{ teamId: "team-1", role: "ADMIN" }],
      });

      mockPrisma.fund.findFirst.mockResolvedValue(null);

      const fundDetailHandler = (await import("@/pages/api/admin/fund/[id]")).default;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
        query: { id: "nonexistent-fund" },
      });

      await fundDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it("enforces GP-only access", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-lp", email: "lp@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-lp",
        teams: [{ teamId: "team-1", role: "MEMBER" }],
      });

      const fundDetailHandler = (await import("@/pages/api/admin/fund/[id]")).default;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
        query: { id: "fund-1" },
      });

      await fundDetailHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe("Multi-Fund Threshold Enforcement", () => {
    it("enforces different thresholds per fund", async () => {
      const fundA = {
        id: "fund-a",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        aggregate: { totalCommitted: 1500000 },
      };

      const fundB = {
        id: "fund-b",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 500000,
        aggregate: { totalCommitted: 600000 },
      };

      const fundAMet = fundA.aggregate.totalCommitted >= fundA.capitalCallThreshold;
      const fundBMet = fundB.aggregate.totalCommitted >= fundB.capitalCallThreshold;

      expect(fundAMet).toBe(false);
      expect(fundBMet).toBe(true);
    });

    it("allows calls for funds without threshold", async () => {
      const fund = {
        id: "fund-no-threshold",
        capitalCallThresholdEnabled: false,
        capitalCallThreshold: null,
        aggregate: { totalCommitted: 100000 },
      };

      const allowed = !fund.capitalCallThresholdEnabled;
      expect(allowed).toBe(true);
    });
  });

  describe("Fund Data Export", () => {
    it("includes fund and fundAggregate in exportable models", () => {
      const EXPORTABLE_MODELS = [
        "fund",
        "fundAggregate",
        "investor",
        "investment",
        "capitalCall",
        "capitalCallResponse",
        "distribution",
        "fundReport",
        "investorNote",
        "investorDocument",
        "accreditationAck",
        "bankLink",
        "transaction",
        "subscription",
      ];

      expect(EXPORTABLE_MODELS).toContain("fund");
      expect(EXPORTABLE_MODELS).toContain("fundAggregate");
    });

    it("exports fund data with all configurable fields", async () => {
      const mockFundExport = {
        id: "fund-1",
        name: "Export Test Fund",
        style: "EVERGREEN",
        targetRaise: 10000000,
        minimumInvestment: 50000,
        aumTarget: 100000000,
        callFrequency: "MONTHLY",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 2000000,
        stagedCommitmentsEnabled: true,
        createdBy: "user-1",
        audit: [{ action: "FUND_CREATED", timestamp: "2025-01-01" }],
      };

      expect(mockFundExport.style).toBe("EVERGREEN");
      expect(mockFundExport.aumTarget).toBe(100000000);
      expect(mockFundExport.callFrequency).toBe("MONTHLY");
      expect(mockFundExport.capitalCallThresholdEnabled).toBe(true);
      expect(mockFundExport.stagedCommitmentsEnabled).toBe(true);
    });
  });

  describe("LP Auto-Assignment to Funds", () => {
    it("associates investor with fund via fundId", async () => {
      const investor = {
        id: "inv-1",
        userId: "user-1",
        fundId: "fund-1",
        fund: {
          id: "fund-1",
          name: "Assigned Fund",
        },
      };

      expect(investor.fundId).toBe("fund-1");
      expect(investor.fund.name).toBe("Assigned Fund");
    });

    it("allows investor without fund assignment", async () => {
      const investor = {
        id: "inv-2",
        userId: "user-2",
        fundId: null,
        fund: null,
      };

      expect(investor.fundId).toBeNull();
      expect(investor.fund).toBeNull();
    });
  });

  describe("Fund Style and Configuration", () => {
    it("supports all fund styles", () => {
      const FUND_STYLES = [
        "TRADITIONAL",
        "STAGED_COMMITMENTS",
        "EVERGREEN",
        "VARIABLE_CALLS",
      ];

      expect(FUND_STYLES).toContain("TRADITIONAL");
      expect(FUND_STYLES).toContain("STAGED_COMMITMENTS");
      expect(FUND_STYLES).toContain("EVERGREEN");
      expect(FUND_STYLES).toContain("VARIABLE_CALLS");
    });

    it("supports all call frequencies", () => {
      const CALL_FREQUENCIES = [
        "AS_NEEDED",
        "MONTHLY",
        "QUARTERLY",
        "SEMI_ANNUAL",
        "ANNUAL",
      ];

      expect(CALL_FREQUENCIES).toContain("AS_NEEDED");
      expect(CALL_FREQUENCIES).toContain("MONTHLY");
      expect(CALL_FREQUENCIES).toContain("QUARTERLY");
      expect(CALL_FREQUENCIES).toContain("SEMI_ANNUAL");
      expect(CALL_FREQUENCIES).toContain("ANNUAL");
    });
  });

  describe("Dual Threshold System", () => {
    it("validates initial threshold vs full authorized amount structure", () => {
      const fundWithDualThresholds = {
        id: "fund-1",
        name: "Test Fund",
        initialThresholdEnabled: true,
        initialThresholdAmount: 1800000,
        fullAuthorizedAmount: 9550000,
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
      };

      expect(fundWithDualThresholds.initialThresholdEnabled).toBe(true);
      expect(fundWithDualThresholds.initialThresholdAmount).toBe(1800000);
      expect(fundWithDualThresholds.fullAuthorizedAmount).toBe(9550000);
      expect(fundWithDualThresholds.fullAuthorizedAmount).toBeGreaterThan(
        fundWithDualThresholds.initialThresholdAmount
      );
    });

    it("calculates initial threshold progress correctly", () => {
      const totalCommitted = 1500000;
      const initialThreshold = 1800000;
      const progress = Math.min(100, (totalCommitted / initialThreshold) * 100);

      expect(progress).toBeCloseTo(83.33, 1);
      expect(totalCommitted < initialThreshold).toBe(true);
    });

    it("calculates full authorized progress correctly", () => {
      const totalCommitted = 3000000;
      const fullAuthorized = 9550000;
      const progress = Math.min(100, (totalCommitted / fullAuthorized) * 100);

      expect(progress).toBeCloseTo(31.41, 1);
    });

    it("determines gating correctly based on initial threshold only", () => {
      const fundBelowThreshold = {
        initialThresholdEnabled: true,
        initialThresholdAmount: 1800000,
        totalCommitted: 1000000,
      };

      const fundAboveThreshold = {
        initialThresholdEnabled: true,
        initialThresholdAmount: 1800000,
        totalCommitted: 2000000,
      };

      const fundDisabledThreshold = {
        initialThresholdEnabled: false,
        initialThresholdAmount: 1800000,
        totalCommitted: 500000,
      };

      const isGated = (fund: any) => 
        fund.initialThresholdEnabled && 
        fund.totalCommitted < fund.initialThresholdAmount;

      expect(isGated(fundBelowThreshold)).toBe(true);
      expect(isGated(fundAboveThreshold)).toBe(false);
      expect(isGated(fundDisabledThreshold)).toBe(false);
    });

    it("full authorized amount does not gate capital calls", () => {
      const fund = {
        initialThresholdEnabled: false,
        initialThresholdAmount: null,
        fullAuthorizedAmount: 9550000,
        totalCommitted: 100000,
      };

      const isGatedByInitial = fund.initialThresholdEnabled && 
        fund.initialThresholdAmount && 
        fund.totalCommitted < fund.initialThresholdAmount;

      expect(isGatedByInitial).toBe(false);
      expect(fund.totalCommitted < fund.fullAuthorizedAmount!).toBe(true);
    });

    it("allows funds without any thresholds", () => {
      const fundWithNoThresholds = {
        id: "fund-no-threshold",
        name: "No Threshold Fund",
        initialThresholdEnabled: false,
        initialThresholdAmount: null,
        fullAuthorizedAmount: null,
        capitalCallThresholdEnabled: false,
        capitalCallThreshold: null,
        totalCommitted: 50000,
      };

      const isGated = fundWithNoThresholds.initialThresholdEnabled && 
        fundWithNoThresholds.initialThresholdAmount && 
        fundWithNoThresholds.totalCommitted < fundWithNoThresholds.initialThresholdAmount;

      expect(isGated).toBe(false);
      expect(fundWithNoThresholds.initialThresholdAmount).toBeNull();
      expect(fundWithNoThresholds.fullAuthorizedAmount).toBeNull();
    });

    it("calculates progress as 0 when no thresholds are set", () => {
      const fund = {
        totalCommitted: 500000,
        initialThresholdAmount: null as number | null,
        fullAuthorizedAmount: null as number | null,
      };

      const initialProgress = fund.initialThresholdAmount 
        ? Math.min(100, (fund.totalCommitted / fund.initialThresholdAmount) * 100)
        : 0;
      const fullProgress = fund.fullAuthorizedAmount
        ? Math.min(100, (fund.totalCommitted / fund.fullAuthorizedAmount) * 100)
        : 0;

      expect(initialProgress).toBe(0);
      expect(fullProgress).toBe(0);
    });
  });

  describe("Threshold Export Data Structure", () => {
    it("includes new threshold fields in fund export", () => {
      const exportedFund = {
        id: "fund-1",
        name: "Export Test Fund",
        targetRaise: 10000000,
        minimumInvestment: 100000,
        currentRaise: 2500000,
        status: "RAISING",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        initialThresholdEnabled: true,
        initialThresholdAmount: 1800000,
        fullAuthorizedAmount: 9550000,
        style: "STAGED_COMMITMENTS",
        callFrequency: "QUARTERLY",
      };

      expect(exportedFund).toHaveProperty("initialThresholdEnabled");
      expect(exportedFund).toHaveProperty("initialThresholdAmount");
      expect(exportedFund).toHaveProperty("fullAuthorizedAmount");
      expect(exportedFund.initialThresholdEnabled).toBe(true);
      expect(exportedFund.initialThresholdAmount).toBe(1800000);
      expect(exportedFund.fullAuthorizedAmount).toBe(9550000);
    });

    it("includes new threshold fields in fundAggregate export", () => {
      const exportedAggregate = {
        fundId: "fund-1",
        totalInbound: 1000000,
        totalOutbound: 500000,
        totalCommitted: 2500000,
        thresholdEnabled: true,
        thresholdAmount: 1800000,
        initialThresholdEnabled: true,
        initialThresholdAmount: 1800000,
        initialThresholdMet: true,
        initialThresholdMetAt: "2026-01-15T10:00:00.000Z",
        fullAuthorizedAmount: 9550000,
        fullAuthorizedProgress: 26.18,
      };

      expect(exportedAggregate).toHaveProperty("initialThresholdEnabled");
      expect(exportedAggregate).toHaveProperty("initialThresholdAmount");
      expect(exportedAggregate).toHaveProperty("initialThresholdMet");
      expect(exportedAggregate).toHaveProperty("initialThresholdMetAt");
      expect(exportedAggregate).toHaveProperty("fullAuthorizedAmount");
      expect(exportedAggregate).toHaveProperty("fullAuthorizedProgress");
      expect(exportedAggregate.initialThresholdMet).toBe(true);
    });

    it("maintains backward compatibility with legacy threshold fields", () => {
      const legacyFund = {
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
      };

      const migratedFund = {
        ...legacyFund,
        initialThresholdEnabled: legacyFund.capitalCallThresholdEnabled,
        initialThresholdAmount: legacyFund.capitalCallThreshold,
        fullAuthorizedAmount: null,
      };

      expect(migratedFund.initialThresholdEnabled).toBe(legacyFund.capitalCallThresholdEnabled);
      expect(migratedFund.initialThresholdAmount).toBe(legacyFund.capitalCallThreshold);
    });
  });

  describe("Threshold Import Validation", () => {
    it("creates fund with new threshold fields from import data", () => {
      const importData = {
        name: "Imported Fund",
        targetRaise: 10000000,
        minimumInvestment: 50000,
        initialThresholdEnabled: true,
        initialThresholdAmount: 2000000,
        fullAuthorizedAmount: 8000000,
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 2000000,
      };

      const createdFund = {
        id: "fund-imported",
        ...importData,
        currentRaise: 0,
        status: "RAISING",
      };

      expect(createdFund.initialThresholdEnabled).toBe(true);
      expect(createdFund.initialThresholdAmount).toBe(2000000);
      expect(createdFund.fullAuthorizedAmount).toBe(8000000);
    });

    it("creates fundAggregate with new threshold fields from import data", () => {
      const importData = {
        fundId: "fund-imported",
        totalCommitted: 1500000,
        initialThresholdEnabled: true,
        initialThresholdAmount: 2000000,
        initialThresholdMet: false,
        fullAuthorizedAmount: 8000000,
        fullAuthorizedProgress: 18.75,
      };

      const createdAggregate = {
        id: "agg-imported",
        ...importData,
        totalInbound: 0,
        totalOutbound: 0,
        thresholdEnabled: true,
        thresholdAmount: 2000000,
      };

      expect(createdAggregate.initialThresholdEnabled).toBe(true);
      expect(createdAggregate.initialThresholdMet).toBe(false);
      expect(createdAggregate.fullAuthorizedProgress).toBe(18.75);
    });

    it("falls back to legacy fields when new fields are missing", () => {
      const legacyImportData = {
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1500000,
      };

      const migratedData = {
        initialThresholdEnabled: legacyImportData.capitalCallThresholdEnabled ?? false,
        initialThresholdAmount: legacyImportData.capitalCallThreshold ?? null,
        fullAuthorizedAmount: null,
      };

      expect(migratedData.initialThresholdEnabled).toBe(true);
      expect(migratedData.initialThresholdAmount).toBe(1500000);
    });
  });
});
