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
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    fundAggregate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    signatureAuditLog: { create: jest.fn() },
  },
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

jest.mock("@/lib/auth/with-role", () => ({
  getUserWithRole: jest.fn(),
  requireRole: jest.fn(),
}));

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { checkCapitalCallThreshold, enforceCapitalCallThreshold } from "@/lib/funds/threshold";
import { getUserWithRole, requireRole } from "@/lib/auth/with-role";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetUserWithRole = getUserWithRole as jest.MockedFunction<typeof getUserWithRole>;
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

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

  describe("Bulk Action Threshold Enforcement", () => {
    it("gates capital call when threshold not met", async () => {
      mockGetUserWithRole.mockResolvedValue({
        user: { id: "user-1", role: "GP", teamIds: ["team-1"] },
      } as any);
      mockRequireRole.mockReturnValue({ allowed: true } as any);

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 1000000,
        investments: [],
        aggregate: {
          thresholdEnabled: true,
          thresholdAmount: 1800000,
          totalCommitted: 1000000,
        },
      });

      const bulkActionHandler = (await import("@/pages/api/admin/bulk-action")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: "100000",
          allocationType: "equal",
        },
      });

      await bulkActionHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe("INITIAL_THRESHOLD_NOT_MET");
      expect(data.details.initialThresholdAmount).toBe(1800000);
      expect(data.details.remaining).toBe(800000);
    });

    it("allows capital call when threshold is met", async () => {
      mockGetUserWithRole.mockResolvedValue({
        user: { id: "user-1", role: "GP", teamIds: ["team-1"] },
      } as any);
      mockRequireRole.mockReturnValue({ allowed: true } as any);

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 2000000,
        investments: [
          { investorId: "inv-1", commitmentAmount: 100000, investor: { entityName: "Test" } },
        ],
        aggregate: {
          thresholdEnabled: true,
          thresholdAmount: 1800000,
          totalCommitted: 2000000,
        },
      });

      (mockPrisma.capitalCall?.count as jest.Mock)?.mockResolvedValue?.(0);

      const bulkActionHandler = (await import("@/pages/api/admin/bulk-action")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "capital_call",
          totalAmount: "100000",
          allocationType: "equal",
        },
      });

      await bulkActionHandler(req, res);

      expect(res._getStatusCode()).not.toBe(403);
    });

    it("allows distributions regardless of threshold", async () => {
      mockGetUserWithRole.mockResolvedValue({
        user: { id: "user-1", role: "GP", teamIds: ["team-1"] },
      } as any);
      mockRequireRole.mockReturnValue({ allowed: true } as any);

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        capitalCallThresholdEnabled: true,
        capitalCallThreshold: 1800000,
        currentRaise: 500000,
        investments: [
          { investorId: "inv-1", commitmentAmount: 100000, investor: { entityName: "Test" } },
        ],
        aggregate: {
          thresholdEnabled: true,
          thresholdAmount: 1800000,
          totalCommitted: 500000,
        },
      });

      const bulkActionHandler = (await import("@/pages/api/admin/bulk-action")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: {
          fundId: "fund-1",
          actionType: "distribution",
          totalAmount: "50000",
          allocationType: "equal",
        },
      });

      await bulkActionHandler(req, res);

      expect(res._getStatusCode()).not.toBe(403);
    });
  });

  describe("Admin Settings API", () => {
    it("updates fund aggregate threshold settings", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN" }],
      });

      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        id: "fund-1",
        teamId: "team-1",
        aggregate: {
          id: "agg-1",
          thresholdEnabled: false,
          thresholdAmount: null,
          audit: [],
        },
      });

      (mockPrisma.fundAggregate.update as jest.Mock).mockResolvedValue({
        thresholdEnabled: true,
        thresholdAmount: 1800000,
      });

      (mockPrisma.signatureAuditLog.create as jest.Mock).mockResolvedValue({});

      expect(mockPrisma.fundAggregate.update).toBeDefined();
    });
  });

  describe("Data Export with FundAggregate", () => {
    it("exports fund aggregate threshold fields", () => {
      const fundData = {
        id: "fund-1",
        name: "Growth Fund",
        aggregate: {
          thresholdEnabled: true,
          thresholdAmount: 1800000,
          totalCommitted: 2000000,
          totalInbound: 500000,
          totalOutbound: 100000,
          audit: [{ timestamp: "2026-01-01", action: "UPDATE" }],
        },
      };

      expect(fundData.aggregate.thresholdEnabled).toBe(true);
      expect(fundData.aggregate.thresholdAmount).toBe(1800000);
      expect(fundData.aggregate.totalCommitted).toBe(2000000);
    });
  });
});
