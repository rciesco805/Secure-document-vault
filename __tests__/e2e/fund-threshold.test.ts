import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    fund: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { checkCapitalCallThreshold, enforceCapitalCallThreshold } from "@/lib/funds/threshold";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Fund Capital Call Threshold", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkCapitalCallThreshold", () => {
    it("allows capital calls when threshold is disabled", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        capitalCallThresholdEnabled: false,
        capitalCallThreshold: null,
        currentRaise: 500000,
        targetRaise: 2000000,
      });

      const result = await checkCapitalCallThreshold("fund-1");

      expect(result.allowed).toBe(true);
      expect(result.thresholdEnabled).toBe(false);
      expect(result.threshold).toBeNull();
    });

    it("allows capital calls when threshold is met", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 2000000,
        targetRaise: 5000000,
      });

      const result = await checkCapitalCallThreshold("fund-1");

      expect(result.allowed).toBe(true);
      expect(result.thresholdEnabled).toBe(true);
      expect(result.threshold).toBe(1800000);
      expect(result.currentRaise).toBe(2000000);
    });

    it("blocks capital calls when threshold is not met", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 1000000,
        targetRaise: 5000000,
      });

      const result = await checkCapitalCallThreshold("fund-1");

      expect(result.allowed).toBe(false);
      expect(result.thresholdEnabled).toBe(true);
      expect(result.threshold).toBe(1800000);
      expect(result.currentRaise).toBe(1000000);
      expect(result.message).toContain("$800,000 more");
    });

    it("returns not found for missing fund", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await checkCapitalCallThreshold("nonexistent");

      expect(result.allowed).toBe(false);
      expect(result.message).toBe("Fund not found");
    });

    it("calculates percent complete correctly", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 2000000,
        currentRaise: 1000000,
        targetRaise: 4000000,
      });

      const result = await checkCapitalCallThreshold("fund-1");

      expect(result.percentComplete).toBe(25);
    });
  });

  describe("enforceCapitalCallThreshold", () => {
    it("throws error when threshold not met", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 500000,
        targetRaise: 5000000,
      });

      await expect(enforceCapitalCallThreshold("fund-1")).rejects.toThrow(
        "Capital calls require at least"
      );
    });

    it("does not throw when threshold is met", async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 2000000,
        targetRaise: 5000000,
      });

      await expect(enforceCapitalCallThreshold("fund-1")).resolves.not.toThrow();
    });
  });

  describe("Fund Settings API", () => {
    it("updates fund threshold settings with audit log", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        name: "Test Fund",
        ndaGateEnabled: true,
        capitalCallThresholdEnabled: false,
        capitalCallThreshold: null,
        callFrequency: "AS_NEEDED",
        stagedCommitmentsEnabled: false,
      });

      (mockPrisma.fund.update as jest.Mock).mockResolvedValue({
        id: "fund-1",
        name: "Test Fund",
        ndaGateEnabled: true,
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        callFrequency: "QUARTERLY",
        stagedCommitmentsEnabled: true,
        currentRaise: 500000,
        targetRaise: 5000000,
      });

      (mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const settingsHandler = (await import("@/pages/api/funds/[fundId]/settings")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "PATCH",
        query: { fundId: "fund-1" },
        body: {
          capitalCallThresholdEnabled: true,
          capitalCallThreshold: 1800000,
          callFrequency: "QUARTERLY",
          stagedCommitmentsEnabled: true,
        },
      });

      await settingsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.fund.capitalCallThresholdEnabled).toBe(true);
      expect(data.fund.capitalCallThreshold).toBe(1800000);
      expect(data.fund.callFrequency).toBe("QUARTERLY");
    });

    it("returns fund config on GET", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        name: "Test Fund",
        ndaGateEnabled: true,
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        callFrequency: "QUARTERLY",
        stagedCommitmentsEnabled: false,
        currentRaise: 1000000,
        targetRaise: 5000000,
      });

      const settingsHandler = (await import("@/pages/api/funds/[fundId]/settings")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
        query: { fundId: "fund-1" },
      });

      await settingsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.fund.capitalCallThreshold).toBe(1800000);
      expect(data.fund.callFrequency).toBe("QUARTERLY");
    });
  });

  describe("Data Export/Import with Threshold Fields", () => {
    it("exports fund config fields", async () => {
      const fundData = {
        id: "fund-1",
        name: "Growth Fund",
        targetRaise: 5000000,
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        callFrequency: "QUARTERLY",
        stagedCommitmentsEnabled: true,
        customSettings: { thresholdNotifiedAt: "2026-01-15" },
      };

      expect(fundData.capitalCallThresholdEnabled).toBe(true);
      expect(fundData.capitalCallThreshold).toBe(1800000);
      expect(fundData.callFrequency).toBe("QUARTERLY");
      expect(fundData.stagedCommitmentsEnabled).toBe(true);
    });

    it("imports fund config with threshold defaults", async () => {
      const importedFund = {
        name: "New Fund",
        targetRaise: 2000000,
      };

      const defaults = {
        capitalCallThresholdEnabled: importedFund.capitalCallThresholdEnabled ?? false,
        capitalCallThreshold: importedFund.capitalCallThreshold || null,
        callFrequency: importedFund.callFrequency || "AS_NEEDED",
        stagedCommitmentsEnabled: importedFund.stagedCommitmentsEnabled ?? false,
      };

      expect(defaults.capitalCallThresholdEnabled).toBe(false);
      expect(defaults.callFrequency).toBe("AS_NEEDED");
    });
  });
});
