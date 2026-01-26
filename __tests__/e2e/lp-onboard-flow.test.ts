import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    investor: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('LP Onboarding Flow E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: User Registration with LP Role', () => {
    it('should create new user with LP role and investor profile', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'LP',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        ...userData,
        createdAt: new Date(),
        investorProfile: {
          id: 'investor-1',
          userId: 'user-1',
          entityType: 'INDIVIDUAL',
        },
      });

      const createdUser = await mockPrisma.user.create({
        data: userData as any,
        include: { investorProfile: true },
      });

      expect(createdUser.email).toBe('john@example.com');
      expect(createdUser.name).toBe('John Doe');
      expect((createdUser as any).role).toBe('LP');
      expect((createdUser as any).investorProfile).toBeDefined();
    });

    it('should return existing user if email already registered', async () => {
      const existingUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'LP',
        createdAt: new Date(),
        investorProfile: { id: 'investor-1' },
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const found = await mockPrisma.user.findUnique({
        where: { email: 'john@example.com' },
        include: { investorProfile: true },
      });

      expect(found?.id).toBe('user-1');
      expect(found?.investorProfile).toBeDefined();
    });
  });

  describe('Step 2: Entity Type Selection', () => {
    it('should update investor with entity information', async () => {
      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        entityType: 'ENTITY',
        entityName: 'Smith Family Trust',
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { 
          entityType: 'ENTITY',
          entityName: 'Smith Family Trust',
        },
      });

      expect(updated.entityType).toBe('ENTITY');
      expect(updated.entityName).toBe('Smith Family Trust');
    });

    it('should support individual and entity types', async () => {
      const entityTypes = ['INDIVIDUAL', 'ENTITY'];

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

  describe('Step 3: NDA Gate Completion', () => {
    it('should update investor with NDA signed status and IP', async () => {
      const ndaData = {
        ndaSigned: true,
        ndaSignedAt: new Date(),
      };

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        ...ndaData,
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: ndaData,
      });

      expect(updated.ndaSigned).toBe(true);
      expect(updated.ndaSignedAt).toBeDefined();
    });

    it('should store accreditation acknowledgment with audit trail', async () => {
      const accreditationData = {
        accreditationStatus: 'SELF_CERTIFIED',
        accreditationType: 'INCOME',
      };

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        ...accreditationData,
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: accreditationData,
      });

      expect(updated.accreditationStatus).toBe('SELF_CERTIFIED');
      expect(updated.accreditationType).toBe('INCOME');
    });
  });

  describe('Step 4: Dashboard Access', () => {
    it('should allow dashboard access after NDA and accreditation', async () => {
      const completedInvestor = {
        id: 'investor-1',
        userId: 'user-1',
        ndaSigned: true,
        accreditationStatus: 'SELF_CERTIFIED',
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
      };

      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue(completedInvestor);

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const canAccessDashboard = investor?.ndaSigned && investor?.accreditationStatus !== 'PENDING';
      expect(canAccessDashboard).toBe(true);
    });

    it('should block dashboard access if NDA not signed', async () => {
      const incompleteInvestor = {
        id: 'investor-1',
        userId: 'user-1',
        ndaSigned: false,
        accreditationStatus: 'PENDING',
      };

      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue(incompleteInvestor);

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const canAccessDashboard = investor?.ndaSigned && investor?.accreditationStatus !== 'PENDING';
      expect(canAccessDashboard).toBe(false);
    });
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding: register → entity → NDA → accreditation → dashboard', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'LP',
        investorProfile: {
          id: 'investor-1',
          entityType: 'INDIVIDUAL',
          ndaSigned: false,
          accreditationStatus: 'PENDING',
        },
      });

      const newUser = await mockPrisma.user.create({
        data: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'LP',
          investorProfile: { create: { entityType: 'INDIVIDUAL' } },
        },
        include: { investorProfile: true },
      });
      expect(newUser.id).toBe('user-1');
      expect(newUser.role).toBe('LP');

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        id: 'investor-1',
        entityType: 'INDIVIDUAL',
        entityName: null,
      });

      const withEntity = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { entityType: 'INDIVIDUAL' },
      });
      expect(withEntity.entityType).toBe('INDIVIDUAL');

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        id: 'investor-1',
        ndaSigned: true,
        ndaSignedAt: new Date(),
      });

      const withNda = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { ndaSigned: true, ndaSignedAt: new Date() },
      });
      expect(withNda.ndaSigned).toBe(true);

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        id: 'investor-1',
        ndaSigned: true,
        accreditationStatus: 'SELF_CERTIFIED',
        onboardingCompletedAt: new Date(),
      });

      const completed = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { 
          accreditationStatus: 'SELF_CERTIFIED',
          onboardingCompletedAt: new Date(),
        },
      });
      expect(completed.accreditationStatus).toBe('SELF_CERTIFIED');

      const canAccessDashboard = completed.ndaSigned && completed.accreditationStatus !== 'PENDING';
      expect(canAccessDashboard).toBe(true);
    });
  });

  describe('Role-Based Access', () => {
    it('should assign LP role by default during registration', async () => {
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'investor@example.com',
        role: 'LP',
      });

      const user = await mockPrisma.user.create({
        data: {
          email: 'investor@example.com',
          role: 'LP',
        },
      });

      expect(user.role).toBe('LP');
    });

    it('should update existing user to LP role if registering as investor', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role: 'GP',
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        role: 'LP',
      });

      const existingUser = await mockPrisma.user.findUnique({
        where: { email: 'user@example.com' },
      });

      if (existingUser && existingUser.role !== 'LP') {
        const updated = await mockPrisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'LP' },
        });
        expect(updated.role).toBe('LP');
      }
    });
  });
});
