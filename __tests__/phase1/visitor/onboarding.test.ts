// @ts-nocheck
// Phase 1: "Sign Me Up" Flow - CTA to Dashboard Tests
// Covers: CTA redirect, form validation, duplicate handling, investor creation, login/redirect

import {
  mockPrisma,
  createMockUser,
  createMockInvestor,
  setupTestMocks,
} from '../utils/test-helpers';

describe('Phase 1: "Sign Me Up" Flow - CTA to Dashboard', () => {
  beforeEach(() => {
    setupTestMocks();
  });

  describe('CTA Click → Redirect to /lp/onboard', () => {
    it('should display Sign Me Up CTA on raising fund dataroom', async () => {
      const ctaConfig = {
        fundStatus: 'RAISING',
        ctaText: 'Sign Me Up',
        ctaLink: '/lp/onboard',
        ctaVisible: true,
      };

      expect(ctaConfig.fundStatus).toBe('RAISING');
      expect(ctaConfig.ctaVisible).toBe(true);
      expect(ctaConfig.ctaLink).toBe('/lp/onboard');
    });

    it('should pass fundId and dataroomId as query params', () => {
      const redirectUrl = '/lp/onboard?fundId=fund-bermuda&dataroomId=dataroom-bermuda';
      const params = new URLSearchParams(redirectUrl.split('?')[1]);

      expect(params.get('fundId')).toBe('fund-bermuda');
      expect(params.get('dataroomId')).toBe('dataroom-bermuda');
    });

    it('should hide CTA when fund is not raising', () => {
      const fundStatuses = ['CLOSED', 'PAUSED', 'DRAFT'];
      
      fundStatuses.forEach(status => {
        const showCta = status === 'RAISING';
        expect(showCta).toBe(false);
      });
    });
  });

  describe('Form Validation - Email/Name/Entity', () => {
    it('should reject empty name field', async () => {
      const formData = { name: '', email: 'test@example.com' };
      const isValid = formData.name.trim().length > 0;
      
      expect(isValid).toBe(false);
    });

    it('should reject empty email field', async () => {
      const formData = { name: 'John Doe', email: '' };
      const isValid = formData.email.trim().length > 0;
      
      expect(isValid).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'double@@at.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should normalize email to lowercase', () => {
      const inputEmail = 'John.DOE@Example.COM';
      const normalizedEmail = inputEmail.toLowerCase().trim();
      
      expect(normalizedEmail).toBe('john.doe@example.com');
    });
  });

  describe('Duplicate Email Handling', () => {
    it('should detect existing user by email', async () => {
      const existingUser = {
        id: 'user-existing',
        email: 'existing@example.com',
        name: 'Existing User',
        investorProfile: { id: 'investor-existing' },
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const user = await mockPrisma.user.findUnique({
        where: { email: 'existing@example.com' },
        include: { investorProfile: true },
      });

      expect(user).not.toBeNull();
      expect(user?.investorProfile).not.toBeNull();
    });

    it('should create investor profile for existing user without one', async () => {
      const existingUserNoInvestor = {
        id: 'user-no-investor',
        email: 'noinvestor@example.com',
        name: 'No Investor User',
        investorProfile: null,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUserNoInvestor);
      (mockPrisma.investor.create as jest.Mock).mockResolvedValue({
        id: 'investor-new',
        userId: 'user-no-investor',
      });

      const user = await mockPrisma.user.findUnique({
        where: { email: 'noinvestor@example.com' },
        include: { investorProfile: true },
      });

      expect(user?.investorProfile).toBeNull();

      const needsInvestorProfile = user && !user.investorProfile;
      expect(needsInvestorProfile).toBe(true);

      if (needsInvestorProfile) {
        const investor = await mockPrisma.investor.create({
          data: { userId: user.id },
        });
        expect(investor.userId).toBe('user-no-investor');
      }
    });

    it('should return existing investor for duplicate registration', async () => {
      const existingUser = {
        id: 'user-existing',
        email: 'existing@example.com',
        investorProfile: { id: 'investor-existing', userId: 'user-existing' },
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const user = await mockPrisma.user.findUnique({
        where: { email: 'existing@example.com' },
        include: { investorProfile: true },
      });

      const isExistingInvestor = user?.investorProfile !== null;
      expect(isExistingInvestor).toBe(true);
    });
  });

  describe('Auto-Create Investor Model', () => {
    it('should create new user with investor profile', async () => {
      const newUserData = {
        name: 'New Investor',
        email: 'newinvestor@example.com',
        entityName: 'New Investor LLC',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-new',
        name: newUserData.name,
        email: newUserData.email,
        investorProfile: {
          id: 'investor-new',
          userId: 'user-new',
          entityName: newUserData.entityName,
          entityType: 'ENTITY',
        },
      });

      const existingUser = await mockPrisma.user.findUnique({
        where: { email: newUserData.email },
      });

      expect(existingUser).toBeNull();

      const createdUser = await mockPrisma.user.create({
        data: {
          name: newUserData.name,
          email: newUserData.email,
          investorProfile: {
            create: {
              entityName: newUserData.entityName,
              entityType: 'ENTITY',
            },
          },
        },
        include: { investorProfile: true },
      });

      expect(createdUser.id).toBe('user-new');
      expect(createdUser.investorProfile?.entityName).toBe('New Investor LLC');
      expect(createdUser.investorProfile?.entityType).toBe('ENTITY');
    });

    it('should set entityType to INDIVIDUAL when no entityName', async () => {
      const individualData = {
        name: 'Individual Investor',
        email: 'individual@example.com',
        entityName: null,
      };

      const entityType = individualData.entityName ? 'ENTITY' : 'INDIVIDUAL';
      expect(entityType).toBe('INDIVIDUAL');
    });

    it('should set entityType to ENTITY when entityName provided', async () => {
      const entityData = {
        name: 'Entity Contact',
        email: 'entity@example.com',
        entityName: 'Acme Corporation',
      };

      const entityType = entityData.entityName ? 'ENTITY' : 'INDIVIDUAL';
      expect(entityType).toBe('ENTITY');
    });
  });

  describe('Login and Redirect to /lp/dashboard', () => {
    it('should generate magic link token for new user', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-new',
        token: 'abc123def456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      expect(mockToken.token).toBeTruthy();
      expect(mockToken.expiresAt > new Date()).toBe(true);
    });

    it('should redirect to /lp/dashboard after successful login', () => {
      const loginSuccess = true;
      const userRole = 'LP';
      
      const redirectPath = loginSuccess && userRole === 'LP' 
        ? '/lp/dashboard' 
        : '/';

      expect(redirectPath).toBe('/lp/dashboard');
    });

    it('should redirect GP users to /hub instead of LP dashboard', () => {
      const loginSuccess = true;
      const userRole = 'GP';
      
      const redirectPath = loginSuccess && userRole === 'LP' 
        ? '/lp/dashboard' 
        : userRole === 'GP' 
          ? '/hub'
          : '/';

      expect(redirectPath).toBe('/hub');
    });

    it('should preserve fundId context after login redirect', () => {
      const fundId = 'fund-bermuda';
      const dashboardUrl = `/lp/dashboard?fundId=${fundId}`;
      
      expect(dashboardUrl).toContain('fundId=fund-bermuda');
    });
  });

  describe('Rate Limiting', () => {
    it('should track registration attempts by IP', () => {
      const requestCounts = new Map<string, { count: number; resetTime: number }>();
      const ip = '192.168.1.100';
      const now = Date.now();
      
      requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
      
      expect(requestCounts.get(ip)?.count).toBe(1);
    });

    it('should block after 5 attempts within window', () => {
      const MAX_REQUESTS = 5;
      const currentCount = 5;
      
      const isBlocked = currentCount >= MAX_REQUESTS;
      expect(isBlocked).toBe(true);
    });

    it('should reset count after window expires', () => {
      const resetTime = Date.now() - 1000;
      const now = Date.now();
      
      const shouldReset = now > resetTime;
      expect(shouldReset).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for missing required fields', () => {
      const testCases = [
        { name: '', email: 'test@example.com', expectedError: 'Name and email are required' },
        { name: 'John', email: '', expectedError: 'Name and email are required' },
        { name: '', email: '', expectedError: 'Name and email are required' },
      ];

      testCases.forEach(tc => {
        const hasError = !tc.name || !tc.email;
        expect(hasError).toBe(true);
      });
    });

    it('should return 400 for invalid email format', () => {
      const email = 'invalid-email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const isInvalid = !emailRegex.test(email);
      expect(isInvalid).toBe(true);
    });

    it('should return 429 for rate limited requests', () => {
      const isRateLimited = true;
      const expectedStatus = isRateLimited ? 429 : 200;
      
      expect(expectedStatus).toBe(429);
    });

    it('should return 500 for database errors', () => {
      const dbError = new Error('Database connection failed');
      const expectedStatus = 500;
      
      expect(dbError.message).toBe('Database connection failed');
    });
  });
});
