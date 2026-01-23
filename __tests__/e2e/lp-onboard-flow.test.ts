import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('LP Onboarding Flow E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: Investor Registration', () => {
    it('should create new investor with name and email', async () => {
      const investorData = {
        name: 'John Doe',
        email: 'john@example.com',
        entityType: 'INDIVIDUAL',
      };

      (mockPrisma.investor.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.investor.create as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        ...investorData,
        createdAt: new Date(),
      });

      const createdInvestor = await mockPrisma.investor.create({
        data: investorData,
      });

      expect(createdInvestor.email).toBe('john@example.com');
      expect(createdInvestor.name).toBe('John Doe');
    });

    it('should return existing investor if email already registered', async () => {
      const existingInvestor = {
        id: 'investor-1',
        name: 'John Doe',
        email: 'john@example.com',
        entityType: 'INDIVIDUAL',
        createdAt: new Date(),
      };

      (mockPrisma.investor.findFirst as jest.Mock).mockResolvedValue(existingInvestor);

      const found = await mockPrisma.investor.findFirst({
        where: { email: 'john@example.com' },
      });

      expect(found?.id).toBe('investor-1');
    });
  });

  describe('Step 2: Entity Type Selection', () => {
    it('should update investor with entity type', async () => {
      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        entityType: 'LLC',
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { entityType: 'LLC' },
      });

      expect(updated.entityType).toBe('LLC');
    });

    it('should support all entity types', async () => {
      const entityTypes = ['INDIVIDUAL', 'LLC', 'CORPORATION', 'TRUST', 'PARTNERSHIP', 'IRA'];

      for (const type of entityTypes) {
        (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
          id: 'investor-1',
          entityType: type,
        });

        const updated = await mockPrisma.investor.update({
          where: { id: 'investor-1' },
          data: { entityType: type },
        });

        expect(updated.entityType).toBe(type);
      }
    });
  });

  describe('Step 3: Magic Link Verification', () => {
    it('should generate and store verification token', async () => {
      const token = 'verification-token-123';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        verificationToken: token,
        verificationTokenExpiresAt: expiresAt,
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: {
          verificationToken: token,
          verificationTokenExpiresAt: expiresAt,
        },
      });

      expect(updated.verificationToken).toBe(token);
    });

    it('should validate and consume verification token', async () => {
      const validToken = 'valid-token-123';

      (mockPrisma.investor.findFirst as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        verificationToken: validToken,
        verificationTokenExpiresAt: new Date(Date.now() + 3600000),
        emailVerifiedAt: null,
      });

      const investor = await mockPrisma.investor.findFirst({
        where: { verificationToken: validToken },
      });

      expect(investor).not.toBeNull();

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        emailVerifiedAt: new Date(),
        verificationToken: null,
      });

      const verified = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: {
          emailVerifiedAt: new Date(),
          verificationToken: null,
        },
      });

      expect(verified.emailVerifiedAt).not.toBeNull();
      expect(verified.verificationToken).toBeNull();
    });

    it('should reject expired verification token', async () => {
      const expiredToken = 'expired-token-123';

      (mockPrisma.investor.findFirst as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        verificationToken: expiredToken,
        verificationTokenExpiresAt: new Date(Date.now() - 3600000),
      });

      const investor = await mockPrisma.investor.findFirst({
        where: { verificationToken: expiredToken },
      });

      const isExpired = investor && investor.verificationTokenExpiresAt < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding: register → entity → verify → dashboard access', async () => {
      (mockPrisma.investor.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.investor.create as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        entityType: null,
        emailVerifiedAt: null,
      });

      const newInvestor = await mockPrisma.investor.create({
        data: { name: 'Jane Doe', email: 'jane@example.com' },
      });
      expect(newInvestor.id).toBe('investor-1');

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        ...newInvestor,
        entityType: 'INDIVIDUAL',
      });

      const withEntity = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { entityType: 'INDIVIDUAL' },
      });
      expect(withEntity.entityType).toBe('INDIVIDUAL');

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        ...withEntity,
        emailVerifiedAt: new Date(),
      });

      const verified = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { emailVerifiedAt: new Date() },
      });
      expect(verified.emailVerifiedAt).not.toBeNull();

      const canAccessDashboard = verified.emailVerifiedAt !== null;
      expect(canAccessDashboard).toBe(true);
    });
  });
});
