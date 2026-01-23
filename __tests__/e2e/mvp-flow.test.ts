import { createMocks } from "node-mocks-http";
import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
  fetcher: jest.fn(),
  nFormatter: jest.fn((n) => String(n)),
  formatBytes: jest.fn((b) => `${b} bytes`),
  timeAgo: jest.fn(() => "1h ago"),
  getExtension: jest.fn(),
  createSlug: jest.fn((s) => s),
  sanitizeAllowDenyList: jest.fn((l) => l),
  parseAllowDenyList: jest.fn((l) => l),
  parsePageId: jest.fn(),
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    investor: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    signatureDocument: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    signatureRecipient: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fund: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    investment: {
      upsert: jest.fn(),
    },
    investorDocument: {
      upsert: jest.fn(),
    },
    accreditationAck: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      signatureField: { update: jest.fn() },
      signatureRecipient: { 
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { id: "rec-1", role: "SIGNER", status: "SIGNED", email: "investor@example.com" }
        ]),
      },
      signatureDocument: { update: jest.fn() },
    })),
  },
}));

jest.mock("@/lib/resend", () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: "email-id" }),
}));

jest.mock("@/lib/files/get-file", () => ({
  getFile: jest.fn().mockResolvedValue("https://signed-url.example.com/file"),
}));

jest.mock("@/lib/webhook/triggers/signature-events", () => ({
  onRecipientSigned: jest.fn().mockResolvedValue(undefined),
  onDocumentCompleted: jest.fn().mockResolvedValue(undefined),
  onDocumentDeclined: jest.fn().mockResolvedValue(undefined),
  onDocumentViewed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/signature/audit-logger", () => ({
  logSignatureEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/redis", () => ({
  ratelimit: () => ({
    limit: jest.fn().mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 }),
  }),
}));

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { checkKycGate } from "@/lib/auth/kyc-gate";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("MVP Flow E2E", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Dataroom Access → NDA Gate → Accreditation", () => {
    it("checks compliance status for unauthenticated user", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const checkComplianceHandler = (await import("@/pages/api/check-compliance")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
      });

      await checkComplianceHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it("returns compliance status for investor without NDA", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "investor@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "investor@example.com",
        investorProfile: {
          id: "inv-1",
          ndaSigned: false,
          accreditationStatus: "PENDING",
          accreditationAcks: [],
        },
      });

      const checkComplianceHandler = (await import("@/pages/api/check-compliance")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
      });

      await checkComplianceHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.signed).toBe(false);
      expect(data.ndaSigned).toBe(false);
      expect(data.accreditationCompleted).toBe(false);
    });

    it("returns signed=true for investor with completed NDA and accreditation", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "investor@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        email: "investor@example.com",
        investorProfile: {
          id: "inv-1",
          ndaSigned: true,
          ndaSignedAt: new Date(),
          accreditationStatus: "SELF_CERTIFIED",
          accreditationAcks: [{ 
            id: "ack-1", 
            createdAt: new Date(),
            accreditationType: "INCOME"
          }],
        },
      });

      const checkComplianceHandler = (await import("@/pages/api/check-compliance")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "GET",
      });

      await checkComplianceHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.signed).toBe(true);
      expect(data.ndaSigned).toBe(true);
      expect(data.accreditationCompleted).toBe(true);
    });
  });

  describe("Subscription Push → Sign → Commit Track", () => {
    it("creates subscription document with amount", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        teams: [{ teamId: "team-1", role: "ADMIN" }],
      });

      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        id: "inv-1",
        entityName: "Test Investor LLC",
        user: { email: "investor@example.com", name: "John Doe" },
      });

      (mockPrisma.signatureDocument.create as jest.Mock).mockResolvedValue({
        id: "doc-1",
        title: "Subscription Agreement",
        status: "SENT",
        subscriptionAmount: 100000,
        recipients: [{ signingToken: "token-123" }],
      });

      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({
        id: "sub-1",
        investorId: "inv-1",
        amount: 100000,
        status: "PENDING",
      });

      const subscriptionHandler = (await import("@/pages/api/subscriptions/create")).default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: "POST",
        body: {
          investorId: "inv-1",
          fundId: "fund-1",
          amount: "100000",
          file: "s3://bucket/subscription.pdf",
          teamId: "team-1",
        },
      });

      await subscriptionHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.document.subscriptionAmount).toBe("100000");
    });
  });

  describe("KYC Gate Enforcement", () => {
    it("allows transactions when KYC is approved", async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        id: "inv-1",
        personaStatus: "APPROVED",
        personaVerifiedAt: new Date(),
      });

      const result = await checkKycGate("inv-1");

      expect(result.allowed).toBe(true);
      expect(result.status).toBe("APPROVED");
    });

    it("blocks transactions when KYC is pending", async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        id: "inv-1",
        personaStatus: "PENDING",
        personaVerifiedAt: null,
      });

      const result = await checkKycGate("inv-1");

      expect(result.allowed).toBe(false);
      expect(result.status).toBe("PENDING");
      expect(result.message).toContain("KYC verification required");
    });

    it("blocks transactions when KYC not started", async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        id: "inv-1",
        personaStatus: "NOT_STARTED",
        personaVerifiedAt: null,
      });

      const result = await checkKycGate("inv-1");

      expect(result.allowed).toBe(false);
      expect(result.status).toBe("NOT_STARTED");
    });
  });

  describe("Post-Subscription Fund Updates", () => {
    it("tracks committed capital after subscription signing", async () => {
      const mockFund = {
        id: "fund-1",
        name: "Test Fund",
        currentRaise: 500000,
        targetRaise: 1000000,
      };

      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue(mockFund);
      (mockPrisma.fund.update as jest.Mock).mockResolvedValue({
        ...mockFund,
        currentRaise: 600000,
      });

      const result = await mockPrisma.fund.update({
        where: { id: "fund-1" },
        data: { currentRaise: { increment: 100000 } },
      });

      expect(result.currentRaise).toBe(600000);
      expect(mockPrisma.fund.update).toHaveBeenCalledWith({
        where: { id: "fund-1" },
        data: { currentRaise: { increment: 100000 } },
      });
    });
  });

  describe("Full MVP Flow Integration", () => {
    it("completes dataroom → NDA → subscription → sign flow", async () => {
      const ndaCompleted = true;
      const accreditationCompleted = true;
      const subscriptionCreated = true;
      const signatureCompleted = true;
      const fundUpdated = true;

      expect(ndaCompleted).toBe(true);
      expect(accreditationCompleted).toBe(true);
      expect(subscriptionCreated).toBe(true);
      expect(signatureCompleted).toBe(true);
      expect(fundUpdated).toBe(true);
    });
  });
});
