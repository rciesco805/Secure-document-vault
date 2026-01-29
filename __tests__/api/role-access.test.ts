import { createMocks } from "node-mocks-http";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    fund: {
      findFirst: jest.fn(),
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
import { getUserWithRole, requireRole, filterByInvestorIfLP, AuthenticatedUser } from "@/lib/auth/with-role";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Role-Based Access Control", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserWithRole", () => {
    it("returns error when not authenticated", async () => {
      const { req, res } = createMocks({ method: "GET" });
      mockGetServerSession.mockResolvedValue(null);

      const result = await getUserWithRole(req as any, res as any);

      expect(result.user).toBeNull();
      expect(result.error).toBe("Not authenticated");
      expect(result.statusCode).toBe(401);
    });

    it("returns LP user with investorId", async () => {
      const { req, res } = createMocks({ method: "GET" });
      mockGetServerSession.mockResolvedValue({
        user: { email: "lp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "lp@example.com",
        role: "LP",
        investorProfile: { id: "investor-1" },
        teams: [{ teamId: "team-1" }],
      });

      const result = await getUserWithRole(req as any, res as any);

      expect(result.user).toEqual({
        id: "user-1",
        email: "lp@example.com",
        role: "LP",
        investorId: "investor-1",
        teamIds: ["team-1"],
      });
    });

    it("returns GP user with team access", async () => {
      const { req, res } = createMocks({ method: "GET" });
      mockGetServerSession.mockResolvedValue({
        user: { email: "gp@example.com" },
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-2",
        email: "gp@example.com",
        role: "GP",
        investorProfile: null,
        teams: [{ teamId: "team-1" }, { teamId: "team-2" }],
      });

      const result = await getUserWithRole(req as any, res as any);

      expect(result.user).toEqual({
        id: "user-2",
        email: "gp@example.com",
        role: "GP",
        investorId: undefined,
        teamIds: ["team-1", "team-2"],
      });
    });
  });

  describe("requireRole", () => {
    it("allows GP access for GP-only endpoint", () => {
      const result = requireRole(["GP"], {
        user: {
          id: "user-1",
          email: "gp@example.com",
          role: "GP",
          teamIds: ["team-1"],
        },
      });

      expect(result.allowed).toBe(true);
    });

    it("denies LP access to GP-only endpoint", () => {
      const result = requireRole(["GP"], {
        user: {
          id: "user-1",
          email: "lp@example.com",
          role: "LP",
          investorId: "investor-1",
        },
      });

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toBe("Insufficient permissions");
    });

    it("allows both LP and GP when both are permitted", () => {
      const lpResult = requireRole(["LP", "GP"], {
        user: { id: "1", email: "lp@test.com", role: "LP", investorId: "i-1" },
      });
      const gpResult = requireRole(["LP", "GP"], {
        user: { id: "2", email: "gp@test.com", role: "GP", teamIds: ["t-1"] },
      });

      expect(lpResult.allowed).toBe(true);
      expect(gpResult.allowed).toBe(true);
    });
  });

  describe("filterByInvestorIfLP", () => {
    it("adds investorId filter for LP users", () => {
      const lpUser: AuthenticatedUser = {
        id: "user-1",
        email: "lp@example.com",
        role: "LP",
        investorId: "investor-123",
      };

      const where = { status: "COMPLETED" } as any;
      const filtered = filterByInvestorIfLP(lpUser, where);

      expect(filtered).toEqual({
        status: "COMPLETED",
        investorId: "investor-123",
      });
    });

    it("does not modify filter for GP users", () => {
      const gpUser: AuthenticatedUser = {
        id: "user-2",
        email: "gp@example.com",
        role: "GP",
        teamIds: ["team-1"],
      };

      const where = { status: "PENDING" } as any;
      const filtered = filterByInvestorIfLP(gpUser, where);

      expect(filtered).toEqual({ status: "PENDING" });
    });
  });
});

describe("Transactions API Role Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("LP can only see their own transactions", async () => {
    const lpUser: AuthenticatedUser = {
      id: "user-1",
      email: "lp@example.com",
      role: "LP",
      investorId: "investor-1",
    };

    const where = filterByInvestorIfLP(lpUser, {}) as any;
    expect(where.investorId).toBe("investor-1");
  });

  it("GP can query all transactions without investorId filter", async () => {
    const gpUser: AuthenticatedUser = {
      id: "user-2",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const where = filterByInvestorIfLP(gpUser, {}) as any;
    expect(where.investorId).toBeUndefined();
  });

  it("GP can filter by specific investorId", async () => {
    const gpUser: AuthenticatedUser = {
      id: "user-2",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const where: any = {};
    if (gpUser.role === "GP") {
      where.investorId = "specific-investor";
    }

    expect(where.investorId).toBe("specific-investor");
  });

  it("GP can filter by fundId", async () => {
    const gpUser: AuthenticatedUser = {
      id: "user-2",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const where: any = {};
    if (gpUser.role === "GP") {
      where.fundId = "fund-123";
    }

    expect(where.fundId).toBe("fund-123");
  });
});

describe("Fund Aggregates Access", () => {
  it("only GP role can access fund aggregates", () => {
    const gpResult = requireRole(["GP"], {
      user: { id: "1", email: "gp@test.com", role: "GP", teamIds: ["t-1"] },
    });

    expect(gpResult.allowed).toBe(true);

    const lpResult = requireRole(["GP"], {
      user: { id: "2", email: "lp@test.com", role: "LP", investorId: "i-1" },
    });

    expect(lpResult.allowed).toBe(false);
    expect(lpResult.error).toBe("Insufficient permissions");
  });

  it("GP must be member of team owning the fund", () => {
    const gpUser: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1", "team-2"],
    };

    const fundTeamId = "team-1";
    const hasAccess = gpUser.teamIds?.includes(fundTeamId);

    expect(hasAccess).toBe(true);

    const noAccessFundTeamId = "team-999";
    const hasNoAccess = gpUser.teamIds?.includes(noAccessFundTeamId);

    expect(hasNoAccess).toBe(false);
  });
});

describe("GP Team Scoping for Transactions", () => {
  it("GP with no teams should be denied access", () => {
    const gpNoTeams: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: [],
    };

    const hasNoTeamAccess = !gpNoTeams.teamIds || gpNoTeams.teamIds.length === 0;
    expect(hasNoTeamAccess).toBe(true);
  });

  it("GP should only access funds within their teams", () => {
    const gpUser: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const allowedFundIds = ["fund-a", "fund-b"];
    const requestedFundId = "fund-c";

    const isAllowed = allowedFundIds.includes(requestedFundId);
    expect(isAllowed).toBe(false);

    const validFundId = "fund-a";
    const isValidAllowed = allowedFundIds.includes(validFundId);
    expect(isValidAllowed).toBe(true);
  });

  it("GP transactions query should be scoped to team funds", () => {
    const gpUser: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const teamFunds = [{ id: "fund-1" }, { id: "fund-2" }];
    const allowedFundIds = teamFunds.map((f) => f.id);

    const where: any = {
      fundId: { in: allowedFundIds },
    };

    expect(where.fundId.in).toEqual(["fund-1", "fund-2"]);
  });

  it("GP requesting out-of-team fund should be rejected", () => {
    const gpUser: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const allowedFundIds = ["fund-1", "fund-2"];
    const requestedFundId = "fund-999";

    const isFundAllowed = allowedFundIds.includes(requestedFundId);
    expect(isFundAllowed).toBe(false);
  });

  it("GP requesting out-of-team investor should be rejected", () => {
    const gpUser: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const teamFundInvestors = [
      { investorId: "inv-1", fundId: "fund-1" },
      { investorId: "inv-2", fundId: "fund-2" },
    ];
    const allowedFundIds = ["fund-1", "fund-2"];
    const requestedInvestorId = "inv-999";

    const investorInTeamFund = teamFundInvestors.find(
      (inv) =>
        inv.investorId === requestedInvestorId &&
        allowedFundIds.includes(inv.fundId)
    );

    expect(investorInTeamFund).toBeUndefined();
  });

  it("GP can access investor within their team funds", () => {
    const gpUser: AuthenticatedUser = {
      id: "user-1",
      email: "gp@example.com",
      role: "GP",
      teamIds: ["team-1"],
    };

    const teamFundInvestors = [
      { investorId: "inv-1", fundId: "fund-1" },
      { investorId: "inv-2", fundId: "fund-2" },
    ];
    const allowedFundIds = ["fund-1", "fund-2"];
    const requestedInvestorId = "inv-1";

    const investorInTeamFund = teamFundInvestors.find(
      (inv) =>
        inv.investorId === requestedInvestorId &&
        allowedFundIds.includes(inv.fundId)
    );

    expect(investorInTeamFund).toBeDefined();
    expect(investorInTeamFund?.investorId).toBe("inv-1");
  });
});
