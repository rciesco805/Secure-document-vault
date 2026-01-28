// @ts-nocheck
// Shared test utilities, mocks, and type extensions for E2E tests
// TypeScript checking is disabled to allow flexible test mocking

import prisma from '@/lib/prisma';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

// Type extensions for test mock data that includes legacy/conceptual properties
export type MockDataroom = {
  id: string;
  teamId: string;
  name: string;
  isPublic?: boolean;
  ndaRequired?: boolean;
  fund?: any;
  createdAt: Date;
  [key: string]: any;
};

export type MockLink = {
  id: string;
  dataroomId: string;
  name: string;
  slug: string;
  isProtected?: boolean;
  [key: string]: any;
};

export type MockView = {
  id: string;
  totalDuration?: number;
  pageCount?: number;
  [key: string]: any;
};

export type MockInvestor = {
  id: string;
  userId: string;
  ndaSignedIp?: string;
  ndaSigned?: boolean;
  personaStatus?: string;
  [key: string]: any;
};

export type MockAccreditation = {
  id: string;
  investorId: string;
  confirmIncome?: boolean;
  [key: string]: any;
};

export const mockPrisma = prisma as jest.Mocked<typeof prisma> & {
  investorFeedback?: any;
  kycResult?: any;
};

// Common mock data factories
export const createMockTeam = (overrides = {}) => ({
  id: 'team-bermuda',
  name: 'Bermuda Franchise Group',
  createdAt: new Date(),
  ...overrides,
});

export const createMockFund = (overrides = {}) => ({
  id: 'fund-bermuda',
  teamId: 'team-bermuda',
  name: 'Bermuda Franchise Fund I',
  targetRaise: 5000000,
  minimumInvestment: 50000,
  status: 'RAISING',
  ndaGateEnabled: false,
  initialThresholdEnabled: true,
  initialThresholdAmount: 1000000,
  createdAt: new Date(),
  ...overrides,
});

export const createMockDataroom = (overrides = {}): MockDataroom => ({
  id: 'dataroom-bermuda',
  teamId: 'team-bermuda',
  name: 'Bermuda Franchise PPM',
  isPublic: true,
  ndaRequired: false,
  createdAt: new Date(),
  ...overrides,
});

export const createMockLink = (overrides = {}): MockLink => ({
  id: 'link-public-123',
  dataroomId: 'dataroom-bermuda',
  name: 'Public Access Link',
  slug: 'bermuda-ppm',
  expiresAt: null,
  isProtected: false,
  password: null,
  allowDownload: true,
  createdAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-test-123',
  email: 'investor@example.com',
  name: 'Test Investor',
  createdAt: new Date(),
  ...overrides,
});

export const createMockInvestor = (overrides = {}): MockInvestor => ({
  id: 'investor-123',
  userId: 'user-test-123',
  entityName: 'Test Entity LLC',
  ndaSigned: false,
  personaStatus: 'NOT_STARTED',
  accreditationStatus: 'NOT_STARTED',
  createdAt: new Date(),
  ...overrides,
});

export const createMockView = (overrides = {}): MockView => ({
  id: 'view-123',
  linkId: 'link-public-123',
  viewerEmail: 'investor@example.com',
  viewedAt: new Date(),
  totalDuration: 0,
  pageCount: 0,
  ...overrides,
});

export const createMockAccreditation = (overrides = {}): MockAccreditation => ({
  id: 'accred-123',
  investorId: 'investor-123',
  confirmIncome: false,
  confirmNetWorth: false,
  confirmEntity: false,
  createdAt: new Date(),
  ...overrides,
});

// Mock request/response helpers
export const createApiMocks = (method: string = 'GET', body: any = {}, query: any = {}) => {
  return createMocks<NextApiRequest, NextApiResponse>({
    method,
    body,
    query,
  });
};

// Jest setup helpers
export const setupTestMocks = () => {
  jest.clearAllMocks();
};

// Re-export for convenience
export { createMocks };
export type { NextApiRequest, NextApiResponse };
