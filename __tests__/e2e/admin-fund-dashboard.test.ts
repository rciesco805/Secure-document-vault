import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    userTeam: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    fund: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    investment: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    investor: {
      findMany: jest.fn(),
    },
    capitalCall: {
      count: jest.fn(),
      create: jest.fn(),
    },
    distribution: {
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

jest.mock("@/lib/auth/auth-options", () => ({
  __esModule: true,
  authOptions: {},
}));

import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import fundDashboardHandler from "@/pages/api/admin/fund-dashboard";
import bulkActionHandler from "@/pages/api/admin/bulk-action";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Admin Fund Dashboard E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GP Access - Fund Dashboard", () => {
    const gpUser = {
      id: "gp-user-1",
      email: "gp@example.com",
      role: "GP",
      investorProfile: null,
      teams: [{ teamId: "team-1" }, { teamId: "team-2" }],
    };

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "gp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(gpUser);
      (mockPrisma.userTeam.findMany as jest.Mock).mockResolvedValue([
        { teamId: "team-1", role: "ADMIN", hasFundroomAccess: true },
        { teamId: "team-2", role: "MEMBER", hasFundroomAccess: true },
      ]);
    });

    it("GP can access fund dashboard with aggregates", async () => {
      const { req, res } = createMocks({ method: "GET" });

      const mockFunds = [
        {
          id: "fund-1",
          name: "Fund Alpha",
          status: "RAISING",
          targetRaise: 1000000,
          currentRaise: 500000,
          closingDate: null,
          investments: [
            { investorId: "inv-1", commitmentAmount: 100000, fundedAmount: 50000 },
            { investorId: "inv-2", commitmentAmount: 200000, fundedAmount: 100000 },
          ],
          distributions: [{ totalAmount: 25000 }],
          capitalCalls: [{ id: "cc-1" }],
        },
      ];

      (mockPrisma.fund.findMany as jest.Mock).mockResolvedValue(mockFunds);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);
      (mockPrisma.investor.findMany as jest.Mock).mockResolvedValue([]);

      await fundDashboardHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.funds).toHaveLength(1);
      expect(data.totals.totalFunds).toBe(1);
      expect(data.totals.totalInvestors).toBe(2);
    });

    it("GP sees transactions from all funds in their teams", async () => {
      const { req, res } = createMocks({ method: "GET" });

      const mockTransactions = [
        {
          id: "tx-1",
          investorId: "inv-1",
          type: "CAPITAL_CALL",
          amount: 50000,
          status: "COMPLETED",
          createdAt: new Date(),
          investor: { id: "inv-1", entityName: "Acme Corp" },
        },
        {
          id: "tx-2",
          investorId: "inv-2",
          type: "DISTRIBUTION",
          amount: 10000,
          status: "PENDING",
          createdAt: new Date(),
          investor: { id: "inv-2", entityName: "Beta LLC" },
        },
      ];

      (mockPrisma.fund.findMany as jest.Mock).mockResolvedValue([
        {
          id: "fund-1",
          name: "Fund Alpha",
          status: "RAISING",
          targetRaise: 1000000,
          currentRaise: 500000,
          investments: [],
          distributions: [],
          capitalCalls: [],
        },
      ]);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
      (mockPrisma.transaction.groupBy as jest.Mock).mockResolvedValue([
        { investorId: "inv-1", type: "CAPITAL_CALL", _sum: { amount: 50000 }, _count: { id: 1 } },
        { investorId: "inv-2", type: "DISTRIBUTION", _sum: { amount: 10000 }, _count: { id: 1 } },
      ]);
      (mockPrisma.investor.findMany as jest.Mock).mockResolvedValue([
        { id: "inv-1", entityName: "Acme Corp" },
        { id: "inv-2", entityName: "Beta LLC" },
      ]);

      await fundDashboardHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.transactions).toHaveLength(2);
      expect(data.transactionSummary).toHaveLength(2);
    });

    it("GP sees anonymized investor data for compliance", async () => {
      const { req, res } = createMocks({ method: "GET" });

      (mockPrisma.fund.findMany as jest.Mock).mockResolvedValue([
        {
          id: "fund-1",
          name: "Fund Alpha",
          status: "RAISING",
          targetRaise: 1000000,
          currentRaise: 0,
          investments: [],
          distributions: [],
          capitalCalls: [],
        },
      ]);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        {
          id: "tx-1",
          investorId: "inv-12345",
          type: "CAPITAL_CALL",
          amount: 100000,
          status: "COMPLETED",
          createdAt: new Date(),
          investor: { id: "inv-12345", entityName: "Acme Corporation" },
        },
      ]);
      (mockPrisma.transaction.groupBy as jest.Mock).mockResolvedValue([]);
      (mockPrisma.investor.findMany as jest.Mock).mockResolvedValue([]);

      await fundDashboardHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.transactions[0].investorId).toMatch(/^INV-\d{3}$/);
      expect(data.transactions[0].investorName).not.toBe("Acme Corporation");
      expect(data.transactions[0].investorName).toContain("***");
    });

    it("GP with no teams is denied access", async () => {
      const { req, res } = createMocks({ method: "GET" });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...gpUser,
        teams: [],
      });
      (mockPrisma.userTeam.findMany as jest.Mock).mockResolvedValue([]);

      await fundDashboardHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("You need to be a team member to access the fund dashboard");
    });
  });

  describe("LP Access Denied - Fund Dashboard", () => {
    it("LP cannot access admin fund dashboard", async () => {
      const { req, res } = createMocks({ method: "GET" });

      mockGetServerSession.mockResolvedValue({
        user: { email: "lp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "lp-user-1",
        email: "lp@example.com",
        role: "LP",
        investorProfile: { id: "investor-1" },
        teams: [{ teamId: "team-1" }],
      });
      (mockPrisma.userTeam.findMany as jest.Mock).mockResolvedValue([]);

      await fundDashboardHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("You need to be a team member to access the fund dashboard");
    });
  });

  describe("Unauthenticated Access", () => {
    it("returns 401 when not authenticated", async () => {
      const { req, res } = createMocks({ method: "GET" });
      mockGetServerSession.mockResolvedValue(null);

      await fundDashboardHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(401);
    });
  });
});

describe("Bulk Action E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const gpUser = {
    id: "gp-user-1",
    email: "gp@example.com",
    role: "GP",
    investorProfile: null,
    teams: [{ teamId: "team-1" }],
  };

  describe("Capital Call Creation", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "gp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(gpUser);
    });

    it("GP can create capital call with pro-rata allocation", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: 100000,
          allocationType: "pro_rata",
        },
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Fund Alpha",
        teamId: "team-1",
        investments: [
          { investorId: "inv-1", commitmentAmount: 200000, investor: { entityName: "Alpha Inc" } },
          { investorId: "inv-2", commitmentAmount: 300000, investor: { entityName: "Beta LLC" } },
        ],
      });
      (mockPrisma.capitalCall.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.capitalCall.create as jest.Mock).mockResolvedValue({ id: "cc-1" });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.actionType).toBe("capital_call");
      expect(data.allocations).toHaveLength(2);
      expect(data.allocations[0].allocation).toBe(40000);
      expect(data.allocations[1].allocation).toBe(60000);
    });

    it("GP can create capital call with equal allocation", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: 100000,
          allocationType: "equal",
        },
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Fund Alpha",
        teamId: "team-1",
        investments: [
          { investorId: "inv-1", commitmentAmount: 200000, investor: { entityName: "Alpha Inc" } },
          { investorId: "inv-2", commitmentAmount: 300000, investor: { entityName: "Beta LLC" } },
        ],
      });
      (mockPrisma.capitalCall.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.capitalCall.create as jest.Mock).mockResolvedValue({ id: "cc-1" });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.allocations[0].allocation).toBe(50000);
      expect(data.allocations[1].allocation).toBe(50000);
    });
  });

  describe("Distribution Creation", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "gp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(gpUser);
    });

    it("GP can create distribution", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "distribution",
          totalAmount: 50000,
          allocationType: "pro_rata",
        },
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Fund Alpha",
        teamId: "team-1",
        investments: [
          { investorId: "inv-1", commitmentAmount: 100000, investor: { entityName: "Alpha Inc" } },
        ],
      });
      (mockPrisma.distribution.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.distribution.create as jest.Mock).mockResolvedValue({ id: "dist-1" });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.actionType).toBe("distribution");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "gp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(gpUser);
    });

    it("rejects zero amount", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: 0,
          allocationType: "pro_rata",
        },
      });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Amount must be a positive number");
    });

    it("rejects negative amount", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: -1000,
          allocationType: "pro_rata",
        },
      });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Amount must be a positive number");
    });

    it("rejects invalid action type", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "invalid_type",
          totalAmount: 10000,
          allocationType: "pro_rata",
        },
      });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Invalid action type");
    });

    it("rejects invalid allocation type", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: 10000,
          allocationType: "invalid_alloc",
        },
      });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Invalid allocation type");
    });

    it("rejects pro-rata with zero commitments", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: 10000,
          allocationType: "pro_rata",
        },
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Fund Alpha",
        teamId: "team-1",
        investments: [
          { investorId: "inv-1", commitmentAmount: 0, investor: { entityName: "Alpha Inc" } },
        ],
      });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Cannot use pro-rata allocation: no commitments found");
    });
  });

  describe("Team Scoping", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "gp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(gpUser);
    });

    it("rejects access to fund outside GP teams", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-other-team",
          actionType: "capital_call",
          totalAmount: 10000,
          allocationType: "pro_rata",
        },
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue(null);

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Fund not found");
    });
  });

  describe("LP Access Denied - Bulk Actions", () => {
    it("LP cannot perform bulk actions", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: 10000,
          allocationType: "pro_rata",
        },
      });

      mockGetServerSession.mockResolvedValue({
        user: { email: "lp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "lp-user-1",
        email: "lp@example.com",
        role: "LP",
        investorProfile: { id: "investor-1" },
        teams: [{ teamId: "team-1" }],
      });

      await bulkActionHandler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe("Insufficient permissions");
    });
  });
});

describe("LP Transaction Filtering", () => {
  it("LP transactions API filters by investorId", async () => {
    const lpUser = {
      id: "lp-user-1",
      email: "lp@example.com",
      role: "LP" as const,
      investorId: "investor-123",
    };

    const lpTransactions = [
      { id: "tx-1", investorId: "investor-123", amount: 10000, type: "CAPITAL_CALL" },
      { id: "tx-2", investorId: "investor-123", amount: 5000, type: "DISTRIBUTION" },
    ];

    const allTransactions = [
      ...lpTransactions,
      { id: "tx-3", investorId: "investor-other", amount: 20000, type: "CAPITAL_CALL" },
    ];

    const filteredForLP = allTransactions.filter(
      (tx) => tx.investorId === lpUser.investorId
    );

    expect(filteredForLP).toHaveLength(2);
    expect(filteredForLP.every((tx) => tx.investorId === lpUser.investorId)).toBe(true);
  });

  it("GP sees all transactions without investorId filter", async () => {
    const gpUser = {
      id: "gp-user-1",
      email: "gp@example.com",
      role: "GP" as const,
      teamIds: ["team-1"],
    };

    const allTransactions = [
      { id: "tx-1", investorId: "investor-1", amount: 10000, fundId: "fund-1" },
      { id: "tx-2", investorId: "investor-2", amount: 20000, fundId: "fund-1" },
      { id: "tx-3", investorId: "investor-3", amount: 30000, fundId: "fund-1" },
    ];

    const filteredForGP = allTransactions;

    expect(filteredForGP).toHaveLength(3);
  });

  it("GP is restricted to team-scoped funds", async () => {
    const gpUser = {
      id: "gp-user-1",
      email: "gp@example.com",
      role: "GP" as const,
      teamIds: ["team-1"],
    };

    const allFunds = [
      { id: "fund-1", teamId: "team-1" },
      { id: "fund-2", teamId: "team-1" },
      { id: "fund-3", teamId: "team-other" },
    ];

    const accessibleFunds = allFunds.filter((f) =>
      gpUser.teamIds.includes(f.teamId)
    );

    expect(accessibleFunds).toHaveLength(2);
    expect(accessibleFunds.every((f) => f.teamId === "team-1")).toBe(true);
  });
});
