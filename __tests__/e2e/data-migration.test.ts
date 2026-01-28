import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    team: { findUnique: jest.fn() },
    fund: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    investment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    investor: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    capitalCall: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    capitalCallResponse: { findMany: jest.fn() },
    distribution: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    fundReport: { findMany: jest.fn() },
    investorNote: { findMany: jest.fn() },
    investorDocument: { findMany: jest.fn() },
    accreditationAck: { findMany: jest.fn() },
    bankLink: { findMany: jest.fn() },
    transaction: { findMany: jest.fn(), create: jest.fn() },
    subscription: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    fundAggregate: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    signatureAuditLog: { create: jest.fn(), findMany: jest.fn() },
    document: { findMany: jest.fn() },
  },
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

jest.mock("@/lib/files/get-file", () => ({
  getFile: jest.fn().mockResolvedValue("https://signed-url.example.com/file"),
}));

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import exportHandler from "@/pages/api/admin/export";
import exportBlobsHandler from "@/pages/api/admin/export-blobs";
import importHandler from "@/pages/api/admin/import";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Data Migration E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.signatureAuditLog.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.signatureAuditLog.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.document.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe("Export Endpoint", () => {
    it("exports all fund data as JSON", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findMany as jest.Mock).mockResolvedValue([
        { id: "fund-1", name: "Growth Fund", targetRaise: 1000000, teamId: "team-1" },
      ]);

      (mockPrisma.investment.findMany as jest.Mock).mockResolvedValue([
        { id: "inv-1", fundId: "fund-1", investorId: "investor-1", commitmentAmount: 100000 },
      ]);

      (mockPrisma.investor.findMany as jest.Mock).mockResolvedValue([
        { id: "investor-1", userId: "user-2", entityName: "Test Investor" },
      ]);

      (mockPrisma.capitalCall.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.capitalCallResponse.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.distribution.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.fundReport.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.investorNote.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.investorDocument.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.accreditationAck.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.bankLink.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.fundAggregate.findMany as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1" },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await exportHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.metadata).toBeDefined();
      expect(data.metadata.teamId).toBe("team-1");
      expect(data.data.funds).toHaveLength(1);
      expect(data.data.investments).toHaveLength(1);
      expect(data.data.investors).toHaveLength(1);
    });

    it("rejects non-admin users", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "member@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "member@example.com",
        teams: [{ teamId: "team-1", role: "MEMBER", team: { id: "team-1" } }],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1" },
      });

      await exportHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
    });

    it("rejects unauthenticated users", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1" },
      });

      await exportHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it("logs export in audit trail", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.investment.findMany as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", models: ["fund"] },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await exportHandler(req, res);

      expect(mockPrisma.signatureAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "DATA_EXPORT",
            userId: "user-1",
            teamId: "team-1",
          }),
        })
      );
    });
  });

  describe("Blob Export Endpoint", () => {
    it("exports blob manifest with signed URLs", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findMany as jest.Mock).mockResolvedValue([{ id: "fund-1" }]);
      (mockPrisma.investment.findMany as jest.Mock).mockResolvedValue([{ investorId: "investor-1" }]);
      (mockPrisma.investorDocument.findMany as jest.Mock).mockResolvedValue([
        {
          storageKey: "docs/file1.pdf",
          documentType: "SUBSCRIPTION",
          investorId: "investor-1",
          title: "Sub Agreement",
        },
      ]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", includeSignedUrls: true },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await exportBlobsHandler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.blobs).toHaveLength(1);
      expect(data.blobs[0].storageKey).toBe("docs/file1.pdf");
      expect(data.blobs[0].signedUrl).toBe("https://signed-url.example.com/file");
    });
  });

  describe("Import Endpoint", () => {
    it("imports fund data with dry run", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue(null);

      const importData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: "admin@example.com",
          teamId: "team-1",
          schemaVersion: "1.0.0",
          modelCounts: { funds: 1 },
        },
        data: {
          funds: [
            {
              id: "fund-1",
              name: "Growth Fund",
              targetRaise: 1000000,
              minimumInvestment: 50000,
              status: "RAISING",
            },
          ],
        },
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", data: importData, dryRun: true },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await importHandler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.imported.funds).toBe(1);
      expect(mockPrisma.fund.create).not.toHaveBeenCalled();
    });

    it("imports fund data without dry run", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.fund.create as jest.Mock).mockResolvedValue({ id: "new-fund-1" });

      const importData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: "admin@example.com",
          teamId: "team-1",
          schemaVersion: "1.0.0",
          modelCounts: { funds: 1 },
        },
        data: {
          funds: [
            {
              id: "fund-1",
              name: "Growth Fund",
              targetRaise: 1000000,
              minimumInvestment: 50000,
              status: "RAISING",
            },
          ],
        },
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", data: importData, dryRun: false },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await importHandler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.imported.funds).toBe(1);
      expect(mockPrisma.fund.create).toHaveBeenCalled();
    });

    it("skips existing funds by name", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({ id: "existing-fund", name: "Growth Fund" });

      const importData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: "admin@example.com",
          teamId: "team-1",
          schemaVersion: "1.0.0",
          modelCounts: { funds: 1 },
        },
        data: {
          funds: [
            {
              id: "fund-1",
              name: "Growth Fund",
              targetRaise: 1000000,
              minimumInvestment: 50000,
              status: "RAISING",
            },
          ],
        },
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", data: importData, dryRun: false },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await importHandler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.skipped.funds).toBe(1);
      expect(data.imported.funds).toBe(0);
    });

    it("logs import in audit trail", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      const importData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: "admin@example.com",
          teamId: "team-1",
          schemaVersion: "1.0.0",
          modelCounts: {},
        },
        data: {},
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", data: importData, dryRun: true },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await importHandler(req, res);

      expect(mockPrisma.signatureAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "DATA_IMPORT",
            userId: "user-1",
            teamId: "team-1",
          }),
        })
      );
    });

    it("rejects non-admin users", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "member@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "member@example.com",
        teams: [{ teamId: "team-1", role: "MEMBER", team: { id: "team-1" } }],
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", data: { metadata: {}, data: {} } },
      });

      await importHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe("Investment Import with ID Mapping", () => {
    it("maps old fund IDs to new fund IDs during import", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN", team: { id: "team-1" } }],
      });

      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue({ id: "existing-fund-id", name: "Growth Fund" });
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({ id: "investor-1" });
      (mockPrisma.investment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.investment.create as jest.Mock).mockResolvedValue({ id: "new-investment" });

      const importData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: "admin@example.com",
          teamId: "team-1",
          schemaVersion: "1.0.0",
          modelCounts: { funds: 1, investments: 1 },
        },
        data: {
          funds: [
            { id: "old-fund-id", name: "Growth Fund", targetRaise: 1000000, minimumInvestment: 50000 },
          ],
          investments: [
            { id: "old-inv-id", fundId: "old-fund-id", investorId: "investor-1", commitmentAmount: 100000 },
          ],
        },
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: { teamId: "team-1", data: importData, dryRun: false },
        headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "test" },
      });

      await importHandler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(mockPrisma.investment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fundId: "existing-fund-id",
          }),
        })
      );
    });
  });
});
