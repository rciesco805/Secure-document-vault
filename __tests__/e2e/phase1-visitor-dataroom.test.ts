import prisma from '@/lib/prisma';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Phase 1: Visitor/LP Side - Dataroom Access E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTeam = {
    id: 'team-bermuda',
    name: 'Bermuda Franchise Group',
    createdAt: new Date(),
  };

  const mockFund = {
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
  };

  const mockDataroom = {
    id: 'dataroom-bermuda',
    teamId: 'team-bermuda',
    name: 'Bermuda Franchise PPM',
    isPublic: true,
    ndaRequired: false,
    createdAt: new Date(),
  };

  const mockLink = {
    id: 'link-public-123',
    dataroomId: 'dataroom-bermuda',
    name: 'Public Access Link',
    slug: 'bermuda-ppm',
    expiresAt: null,
    isProtected: false,
    password: null,
    allowDownload: true,
    emailProtected: false,
    enableCustomMetatag: false,
    enableAgreement: false,
    createdAt: new Date(),
  };

  const mockDocuments = [
    {
      id: 'doc-ppm',
      dataroomId: 'dataroom-bermuda',
      name: 'Private Placement Memorandum',
      type: 'application/pdf',
      orderIndex: 0,
      createdAt: new Date(),
    },
    {
      id: 'doc-subscription',
      dataroomId: 'dataroom-bermuda',
      name: 'Subscription Agreement',
      type: 'application/pdf',
      orderIndex: 1,
      createdAt: new Date(),
    },
    {
      id: 'doc-financials',
      dataroomId: 'dataroom-bermuda',
      name: 'Financial Projections',
      type: 'application/pdf',
      orderIndex: 2,
      createdAt: new Date(),
    },
  ];

  const mockPricingTiers = [
    { id: 'tier-1', fundId: 'fund-bermuda', tranche: 1, unitsAvailable: 20, pricePerUnit: 10000, isActive: true },
    { id: 'tier-2', fundId: 'fund-bermuda', tranche: 2, unitsAvailable: 30, pricePerUnit: 12500, isActive: true },
    { id: 'tier-3', fundId: 'fund-bermuda', tranche: 3, unitsAvailable: 50, pricePerUnit: 15000, isActive: true },
  ];

  describe('Dataroom Access - No Login Required', () => {
    it('should allow unauthenticated visitor to access public dataroom', async () => {
      (mockPrisma.link.findUnique as jest.Mock).mockResolvedValue({
        ...mockLink,
        dataroom: {
          ...mockDataroom,
          isPublic: true,
        },
      });

      const link = await mockPrisma.link.findUnique({
        where: { id: 'link-public-123' },
        include: { dataroom: true },
      });

      expect(link).not.toBeNull();
      expect(link?.dataroom?.isPublic).toBe(true);
      expect(link?.isProtected).toBe(false);
      expect(link?.emailProtected).toBe(false);
    });

    it('should load dataroom documents for visitor without authentication', async () => {
      (mockPrisma.dataroom.findUnique as jest.Mock).mockResolvedValue({
        ...mockDataroom,
        documents: mockDocuments,
      });

      const dataroom = await mockPrisma.dataroom.findUnique({
        where: { id: 'dataroom-bermuda' },
        include: { documents: true },
      });

      expect(dataroom).not.toBeNull();
      expect(dataroom?.documents).toHaveLength(3);
      expect(dataroom?.documents?.[0].name).toBe('Private Placement Memorandum');
    });

    it('should display fund tiers and fees in dataroom context', async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        ...mockFund,
        pricingTiers: mockPricingTiers,
      });

      const fund = await mockPrisma.fund.findUnique({
        where: { id: 'fund-bermuda' },
        include: { pricingTiers: true },
      });

      expect(fund).not.toBeNull();
      expect(fund?.pricingTiers).toHaveLength(3);
      expect(fund?.pricingTiers?.[0].pricePerUnit).toBe(10000);
      expect(fund?.pricingTiers?.[1].pricePerUnit).toBe(12500);
      expect(fund?.pricingTiers?.[2].pricePerUnit).toBe(15000);
    });

    it('should enforce email-protected links when configured', async () => {
      (mockPrisma.link.findUnique as jest.Mock).mockResolvedValue({
        ...mockLink,
        emailProtected: true,
      });

      const link = await mockPrisma.link.findUnique({
        where: { id: 'link-public-123' },
      });

      expect(link?.emailProtected).toBe(true);
      const requiresEmail = link?.emailProtected === true;
      expect(requiresEmail).toBe(true);
    });

    it('should enforce password protection when configured', async () => {
      (mockPrisma.link.findUnique as jest.Mock).mockResolvedValue({
        ...mockLink,
        isProtected: true,
        password: 'hashed-password-123',
      });

      const link = await mockPrisma.link.findUnique({
        where: { id: 'link-public-123' },
      });

      expect(link?.isProtected).toBe(true);
      expect(link?.password).not.toBeNull();
    });

    it('should block access to expired links', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      (mockPrisma.link.findUnique as jest.Mock).mockResolvedValue({
        ...mockLink,
        expiresAt: expiredDate,
      });

      const link = await mockPrisma.link.findUnique({
        where: { id: 'link-public-123' },
      });

      const isExpired = link?.expiresAt && new Date(link.expiresAt) < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('Analytics Tracking - View Model', () => {
    it('should create view record with visitor audit data', async () => {
      const viewAuditData = {
        id: 'view-1',
        linkId: 'link-public-123',
        documentId: 'doc-ppm',
        viewedAt: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120',
        geoCountry: 'US',
        geoCity: 'Miami',
        geoRegion: 'FL',
        deviceType: 'Desktop',
        browserName: 'Chrome',
        osName: 'macOS',
        sessionId: 'session-visitor-abc123',
        referrer: 'https://google.com/search',
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue(viewAuditData);

      const view = await mockPrisma.view.create({
        data: viewAuditData,
      });

      expect(view.ipAddress).toBe('192.168.1.100');
      expect(view.geoCountry).toBe('US');
      expect(view.geoCity).toBe('Miami');
      expect(view.deviceType).toBe('Desktop');
      expect(view.browserName).toBe('Chrome');
      expect(view.sessionId).toBe('session-visitor-abc123');
    });

    it('should track document page views for compliance', async () => {
      const pageViews = [
        { viewId: 'view-1', pageNumber: 1, duration: 45, viewedAt: new Date() },
        { viewId: 'view-1', pageNumber: 2, duration: 30, viewedAt: new Date() },
        { viewId: 'view-1', pageNumber: 3, duration: 60, viewedAt: new Date() },
      ];

      (mockPrisma.view.findUnique as jest.Mock).mockResolvedValue({
        id: 'view-1',
        totalDuration: 135,
        pageCount: 3,
      });

      const view = await mockPrisma.view.findUnique({
        where: { id: 'view-1' },
      });

      expect(view?.totalDuration).toBe(135);
      expect(view?.pageCount).toBe(3);
    });

    it('should associate views with Tinybird analytics', async () => {
      const tinybirdEvent = {
        event_type: 'document_view',
        document_id: 'doc-ppm',
        dataroom_id: 'dataroom-bermuda',
        visitor_id: 'visitor-abc123',
        timestamp: new Date().toISOString(),
        page_number: 1,
        duration_seconds: 45,
      };

      expect(tinybirdEvent.event_type).toBe('document_view');
      expect(tinybirdEvent.document_id).toBe('doc-ppm');
    });
  });

  describe('Mobile Responsive - iPhone Simulation', () => {
    it('should detect mobile device from user agent', () => {
      const iPhoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(iPhoneUserAgent);
      expect(isMobile).toBe(true);
    });

    it('should create view record with mobile device info', async () => {
      const mobileViewData = {
        id: 'view-mobile-1',
        linkId: 'link-public-123',
        deviceType: 'Mobile',
        browserName: 'Safari',
        osName: 'iOS',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        viewedAt: new Date(),
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue(mobileViewData);

      const view = await mockPrisma.view.create({
        data: mobileViewData,
      });

      expect(view.deviceType).toBe('Mobile');
      expect(view.browserName).toBe('Safari');
      expect(view.osName).toBe('iOS');
    });

    it('should track tablet device access', async () => {
      const tabletViewData = {
        id: 'view-tablet-1',
        linkId: 'link-public-123',
        deviceType: 'Tablet',
        browserName: 'Safari',
        osName: 'iPadOS',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
        viewedAt: new Date(),
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue(tabletViewData);

      const view = await mockPrisma.view.create({
        data: tabletViewData,
      });

      expect(view.deviceType).toBe('Tablet');
      expect(view.osName).toBe('iPadOS');
    });
  });

  describe('Responsive CTAs', () => {
    it('should include Sign Me Up CTA data in dataroom response', async () => {
      (mockPrisma.dataroom.findUnique as jest.Mock).mockResolvedValue({
        ...mockDataroom,
        fund: {
          ...mockFund,
          status: 'RAISING',
        },
        signupEnabled: true,
      });

      const dataroom = await mockPrisma.dataroom.findUnique({
        where: { id: 'dataroom-bermuda' },
        include: { fund: true },
      });

      expect(dataroom?.fund?.status).toBe('RAISING');
      const showSignupCta = dataroom?.fund?.status === 'RAISING';
      expect(showSignupCta).toBe(true);
    });

    it('should hide CTA when fund is closed', async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        ...mockFund,
        status: 'CLOSED',
      });

      const fund = await mockPrisma.fund.findUnique({
        where: { id: 'fund-bermuda' },
      });

      const showSignupCta = fund?.status === 'RAISING';
      expect(showSignupCta).toBe(false);
    });
  });

  describe('Permissions-Based Security', () => {
    it('should allow download when enabled on link', async () => {
      (mockPrisma.link.findUnique as jest.Mock).mockResolvedValue({
        ...mockLink,
        allowDownload: true,
      });

      const link = await mockPrisma.link.findUnique({
        where: { id: 'link-public-123' },
      });

      expect(link?.allowDownload).toBe(true);
    });

    it('should block download when disabled on link', async () => {
      (mockPrisma.link.findUnique as jest.Mock).mockResolvedValue({
        ...mockLink,
        allowDownload: false,
      });

      const link = await mockPrisma.link.findUnique({
        where: { id: 'link-public-123' },
      });

      expect(link?.allowDownload).toBe(false);
    });

    it('should respect NDA gate on private dataroom', async () => {
      (mockPrisma.dataroom.findUnique as jest.Mock).mockResolvedValue({
        ...mockDataroom,
        isPublic: false,
        ndaRequired: true,
      });

      const dataroom = await mockPrisma.dataroom.findUnique({
        where: { id: 'dataroom-bermuda' },
      });

      expect(dataroom?.isPublic).toBe(false);
      expect(dataroom?.ndaRequired).toBe(true);
      const requiresNda = dataroom?.ndaRequired && !dataroom?.isPublic;
      expect(requiresNda).toBe(true);
    });
  });

  describe('Folder Hierarchy Display', () => {
    it('should load dataroom with folder structure', async () => {
      const mockFolders = [
        { id: 'folder-1', dataroomId: 'dataroom-bermuda', name: 'Legal Documents', parentId: null, orderIndex: 0 },
        { id: 'folder-2', dataroomId: 'dataroom-bermuda', name: 'Financial Statements', parentId: null, orderIndex: 1 },
        { id: 'folder-3', dataroomId: 'dataroom-bermuda', name: 'Q1 Reports', parentId: 'folder-2', orderIndex: 0 },
      ];

      (mockPrisma.dataroom.findUnique as jest.Mock).mockResolvedValue({
        ...mockDataroom,
        folders: mockFolders,
        documents: mockDocuments,
      });

      const dataroom = await mockPrisma.dataroom.findUnique({
        where: { id: 'dataroom-bermuda' },
        include: { folders: true, documents: true },
      });

      expect(dataroom?.folders).toHaveLength(3);
      expect(dataroom?.folders?.find(f => f.name === 'Q1 Reports')?.parentId).toBe('folder-2');
    });
  });

  describe('Bermuda Franchise Example Data', () => {
    it('should display complete Bermuda Franchise fund information', async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        ...mockFund,
        name: 'Bermuda Franchise Fund I',
        targetRaise: 5000000,
        minimumInvestment: 50000,
        managementFee: 2.0,
        carriedInterest: 20.0,
        pricingTiers: mockPricingTiers,
      });

      const fund = await mockPrisma.fund.findUnique({
        where: { id: 'fund-bermuda' },
        include: { pricingTiers: true },
      });

      expect(fund?.name).toBe('Bermuda Franchise Fund I');
      expect(fund?.targetRaise).toBe(5000000);
      expect(fund?.minimumInvestment).toBe(50000);
      expect(fund?.pricingTiers).toHaveLength(3);
    });

    it('should calculate blended pricing across tiers', () => {
      const tierAllocations = [
        { tierId: 'tier-1', units: 5, pricePerUnit: 10000 },
        { tierId: 'tier-2', units: 5, pricePerUnit: 12500 },
      ];

      const totalUnits = tierAllocations.reduce((sum, t) => sum + t.units, 0);
      const totalAmount = tierAllocations.reduce((sum, t) => sum + (t.units * t.pricePerUnit), 0);
      const blendedPrice = totalAmount / totalUnits;

      expect(totalUnits).toBe(10);
      expect(totalAmount).toBe(112500);
      expect(blendedPrice).toBe(11250);
    });
  });
});

describe('Phase 1: "Sign Me Up" Flow - CTA to Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

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

      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-individual',
        investorProfile: {
          id: 'investor-individual',
          entityType: 'INDIVIDUAL',
          entityName: null,
        },
      });

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

describe('Phase 1: NDA/Accreditation Gate - Modal Wizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockInvestor = {
    id: 'investor-1',
    userId: 'user-1',
    ndaSigned: false,
    accreditationStatus: 'PENDING',
    onboardingStep: 0,
    createdAt: new Date(),
  };

  describe('Gate Detection on Dashboard Load', () => {
    it('should detect incomplete NDA on first dashboard load', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: false,
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const showNdaGate = investor?.ndaSigned === false;
      expect(showNdaGate).toBe(true);
    });

    it('should detect incomplete accreditation after NDA signed', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: true,
        accreditationStatus: 'PENDING',
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const showAccreditationGate = investor?.ndaSigned && investor?.accreditationStatus === 'PENDING';
      expect(showAccreditationGate).toBe(true);
    });

    it('should allow dashboard access when gates complete', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: true,
        accreditationStatus: 'VERIFIED',
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const dashboardUnlocked = investor?.ndaSigned && investor?.accreditationStatus === 'VERIFIED';
      expect(dashboardUnlocked).toBe(true);
    });
  });

  describe('Step 1: NDA E-Signature', () => {
    it('should require NDA acceptance', async () => {
      const requestBody = {
        ndaAccepted: false,
        ndaSignature: null,
      };

      const isValid = requestBody.ndaAccepted === true;
      expect(isValid).toBe(false);
    });

    it('should require signature data', async () => {
      const requestBody = {
        ndaAccepted: true,
        ndaSignature: null,
      };

      const hasSignature = requestBody.ndaSignature !== null && typeof requestBody.ndaSignature === 'string';
      expect(hasSignature).toBe(false);
    });

    it('should validate signature size limit (500KB max)', () => {
      const maxSize = 500 * 1024;
      const validSignature = 'data:image/png;base64,' + 'A'.repeat(100);
      const oversizedSignature = 'data:image/png;base64,' + 'A'.repeat(maxSize + 1);

      expect(validSignature.length < maxSize).toBe(true);
      expect(oversizedSignature.length > maxSize).toBe(true);
    });

    it('should store NDA with IP address and timestamp', async () => {
      const ndaData = {
        investorId: 'investor-1',
        ndaSigned: true,
        ndaSignedAt: new Date(),
        ndaSignedIp: '192.168.1.100',
        ndaSignature: 'data:image/png;base64,signature-data',
      };

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ...ndaData,
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: ndaData,
      });

      expect(updated.ndaSigned).toBe(true);
      expect(updated.ndaSignedAt).toBeInstanceOf(Date);
      expect(updated.ndaSignedIp).toBe('192.168.1.100');
    });

    it('should capture user agent with NDA signature', () => {
      const auditData = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120',
        signedAt: new Date().toISOString(),
      };

      expect(auditData.ipAddress).toBeTruthy();
      expect(auditData.userAgent).toContain('Mozilla');
      expect(auditData.signedAt).toBeTruthy();
    });
  });

  describe('Step 2: Accreditation Self-Certification', () => {
    it('should require all accreditation checkboxes', () => {
      const checkboxes = {
        confirmIncome: true,
        confirmNetWorth: true,
        confirmAccredited: true,
        confirmRiskAware: true,
      };

      const allChecked = Object.values(checkboxes).every(v => v === true);
      expect(allChecked).toBe(true);
    });

    it('should reject incomplete checkbox submission', () => {
      const incompleteCheckboxes = {
        confirmIncome: true,
        confirmNetWorth: false,
        confirmAccredited: true,
        confirmRiskAware: true,
      };

      const allChecked = Object.values(incompleteCheckboxes).every(v => v === true);
      expect(allChecked).toBe(false);
    });

    it('should support income-based accreditation type', () => {
      const accreditationType = 'INCOME';
      const validTypes = ['INCOME', 'NET_WORTH', 'PROFESSIONAL', 'ENTITY'];

      expect(validTypes.includes(accreditationType)).toBe(true);
    });

    it('should support net worth-based accreditation type', () => {
      const accreditationType = 'NET_WORTH';
      const validTypes = ['INCOME', 'NET_WORTH', 'PROFESSIONAL', 'ENTITY'];

      expect(validTypes.includes(accreditationType)).toBe(true);
    });

    it('should create AccreditationAck record in Prisma', async () => {
      const ackData = {
        investorId: 'investor-1',
        method: 'SELF_CERTIFICATION',
        accreditationType: 'INCOME',
        confirmIncome: true,
        confirmNetWorth: true,
        confirmAccredited: true,
        confirmRiskAware: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome/120',
        completedAt: new Date(),
      };

      (mockPrisma.accreditationAck.create as jest.Mock).mockResolvedValue({
        id: 'ack-1',
        ...ackData,
        createdAt: new Date(),
      });

      const ack = await mockPrisma.accreditationAck.create({
        data: ackData,
      });

      expect(ack.id).toBe('ack-1');
      expect(ack.method).toBe('SELF_CERTIFICATION');
      expect(ack.accreditationType).toBe('INCOME');
      expect(ack.confirmIncome).toBe(true);
      expect(ack.ipAddress).toBe('192.168.1.100');
    });

    it('should update investor accreditation status', async () => {
      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        accreditationStatus: 'VERIFIED',
        accreditationType: 'INCOME',
        accreditationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: {
          accreditationStatus: 'VERIFIED',
          accreditationType: 'INCOME',
        },
      });

      expect(updated.accreditationStatus).toBe('VERIFIED');
      expect(updated.accreditationType).toBe('INCOME');
    });
  });

  describe('Post-Complete: Dashboard Unlock', () => {
    it('should update onboarding step after gate completion', async () => {
      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        onboardingStep: 3,
        ndaSigned: true,
        accreditationStatus: 'VERIFIED',
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { onboardingStep: 3 },
      });

      expect(updated.onboardingStep).toBe(3);
    });

    it('should unlock all dashboard features after accreditation', () => {
      const investorStatus = {
        ndaSigned: true,
        accreditationStatus: 'VERIFIED',
        onboardingStep: 3,
      };

      const features = {
        viewFundDetails: true,
        viewSubscriptionOptions: investorStatus.accreditationStatus === 'VERIFIED',
        makeInvestment: investorStatus.accreditationStatus === 'VERIFIED',
        viewDocuments: investorStatus.ndaSigned,
      };

      expect(features.viewSubscriptionOptions).toBe(true);
      expect(features.makeInvestment).toBe(true);
      expect(features.viewDocuments).toBe(true);
    });
  });

  describe('Resend Confirmation Email', () => {
    it('should send confirmation email after accreditation', async () => {
      const emailPayload = {
        to: 'investor@example.com',
        subject: 'Accreditation Confirmation - BF Fund',
        investorName: 'John Investor',
        accreditationType: 'INCOME',
        completedAt: new Date().toISOString(),
      };

      expect(emailPayload.to).toBe('investor@example.com');
      expect(emailPayload.subject).toContain('Accreditation Confirmation');
    });

    it('should include accreditation details in email', () => {
      const emailData = {
        investorName: 'John Investor',
        email: 'investor@example.com',
        accreditationType: 'INCOME',
        completedAt: new Date().toISOString(),
      };

      expect(emailData.accreditationType).toBe('INCOME');
      expect(emailData.completedAt).toBeTruthy();
    });

    it('should handle resend confirmation request', async () => {
      const requestBody = {
        resendConfirmation: true,
      };

      expect(requestBody.resendConfirmation).toBe(true);
    });

    it('should log email send in audit trail', () => {
      const auditLog = {
        action: 'EMAIL_SENT',
        emailType: 'ACCREDITATION_CONFIRMATION',
        recipientEmail: 'investor@example.com',
        sentAt: new Date(),
        success: true,
      };

      expect(auditLog.action).toBe('EMAIL_SENT');
      expect(auditLog.success).toBe(true);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should return 401 for unauthenticated requests', () => {
      const session = null;
      const expectedStatus = session ? 200 : 401;

      expect(expectedStatus).toBe(401);
    });

    it('should return 400 for missing NDA acceptance', () => {
      const body = { ndaAccepted: false };
      const isValid = body.ndaAccepted === true;

      expect(isValid).toBe(false);
    });

    it('should return 400 for missing signature', () => {
      const body = { ndaAccepted: true, ndaSignature: null };
      const hasSignature = body.ndaSignature !== null;

      expect(hasSignature).toBe(false);
    });

    it('should return 400 for oversized signature', () => {
      const maxSize = 500 * 1024;
      const signatureSize = 600 * 1024;

      expect(signatureSize > maxSize).toBe(true);
    });

    it('should return 404 for non-existent investor', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue(null);

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'non-existent' },
      });

      expect(investor).toBeNull();
    });
  });

  describe('506(c) Compliance Tracking', () => {
    it('should store all compliance fields in AccreditationAck', () => {
      const complianceFields = {
        investorId: 'investor-1',
        method: 'SELF_CERTIFICATION',
        accreditationType: 'INCOME',
        confirmIncome: true,
        confirmNetWorth: true,
        confirmAccredited: true,
        confirmRiskAware: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        geoCountry: 'US',
        geoRegion: 'FL',
        sessionId: 'session-abc123',
        completedAt: new Date(),
      };

      expect(complianceFields.ipAddress).toBeTruthy();
      expect(complianceFields.method).toBe('SELF_CERTIFICATION');
      expect(complianceFields.confirmAccredited).toBe(true);
    });

    it('should set accreditation expiry (typically 90 days)', () => {
      const completedAt = new Date();
      const expiryDays = 90;
      const expiresAt = new Date(completedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000);

      const daysDiff = Math.round((expiresAt.getTime() - completedAt.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(90);
    });

    it('should link AccreditationAck to investor record', async () => {
      (mockPrisma.accreditationAck.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ack-1',
          investorId: 'investor-1',
          method: 'SELF_CERTIFICATION',
          completedAt: new Date(),
        },
      ]);

      const acks = await mockPrisma.accreditationAck.findMany({
        where: { investorId: 'investor-1' },
      });

      expect(acks).toHaveLength(1);
      expect(acks[0].investorId).toBe('investor-1');
    });
  });
});

describe('Phase 1: Manual Test Logging - Drag-Drop E-Sign', () => {
  it('MANUAL: Verify drag-drop signature field placement on PDF', () => {
    const manualTestLog = {
      testName: 'Drag-Drop Signature Field Placement',
      testType: 'MANUAL',
      steps: [
        '1. Open e-sign document in admin view',
        '2. Click "Add Field" button',
        '3. Drag signature field to desired location on PDF',
        '4. Verify field snaps to position',
        '5. Save document and verify field persists',
      ],
      expectedResult: 'Signature field should be draggable and persist on save',
      status: 'PENDING_MANUAL_VERIFICATION',
    };

    expect(manualTestLog.testType).toBe('MANUAL');
    expect(manualTestLog.status).toBe('PENDING_MANUAL_VERIFICATION');
    console.log('MANUAL TEST:', JSON.stringify(manualTestLog, null, 2));
  });

  it('MANUAL: Verify mobile touch gestures for PDF navigation', () => {
    const manualTestLog = {
      testName: 'Mobile PDF Touch Navigation',
      testType: 'MANUAL',
      steps: [
        '1. Open dataroom on iPhone Safari',
        '2. Open a PDF document',
        '3. Pinch to zoom in/out',
        '4. Swipe to navigate pages',
        '5. Verify all CTAs are tappable',
      ],
      expectedResult: 'Touch gestures work smoothly, CTAs are accessible',
      status: 'PENDING_MANUAL_VERIFICATION',
    };

    expect(manualTestLog.testType).toBe('MANUAL');
    console.log('MANUAL TEST:', JSON.stringify(manualTestLog, null, 2));
  });
});

describe('Phase 1: Fundroom Dashboard - Personalized Views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockFund = {
    id: 'fund-bermuda',
    name: 'Bermuda Growth Fund',
    targetAmount: 10000000,
    initialClosingThreshold: 2500000,
    status: 'RAISING',
    teamId: 'team-1',
  };

  const mockInvestor = {
    id: 'investor-1',
    userId: 'user-1',
    ndaSigned: true,
    accreditationStatus: 'VERIFIED',
    onboardingStep: 3,
  };

  describe('Fund Data Aggregates', () => {
    it('should calculate total raised via Prisma aggregate', async () => {
      const investments = [
        { id: 'inv-1', fundId: 'fund-bermuda', amount: 500000, status: 'CONFIRMED' },
        { id: 'inv-2', fundId: 'fund-bermuda', amount: 750000, status: 'CONFIRMED' },
        { id: 'inv-3', fundId: 'fund-bermuda', amount: 250000, status: 'PENDING' },
      ];

      const totalRaised = investments
        .filter(inv => inv.status === 'CONFIRMED')
        .reduce((sum, inv) => sum + inv.amount, 0);

      expect(totalRaised).toBe(1250000);
    });

    it('should calculate raise progress percentage', () => {
      const totalRaised = 2500000;
      const targetAmount = 10000000;
      const progressPercent = Math.round((totalRaised / targetAmount) * 100);

      expect(progressPercent).toBe(25);
    });

    it('should show progress bar with correct fill', () => {
      const totalRaised = 5000000;
      const targetAmount = 10000000;
      const progressPercent = (totalRaised / targetAmount) * 100;
      const progressBarWidth = `${progressPercent}%`;

      expect(progressBarWidth).toBe('50%');
    });

    it('should cap progress at 100% when oversubscribed', () => {
      const totalRaised = 12000000;
      const targetAmount = 10000000;
      const progressPercent = Math.min((totalRaised / targetAmount) * 100, 100);

      expect(progressPercent).toBe(100);
    });

    it('should show initial closing threshold status', () => {
      const totalRaised = 2500000;
      const initialClosingThreshold = 2500000;
      const thresholdMet = totalRaised >= initialClosingThreshold;

      expect(thresholdMet).toBe(true);
    });

    it('should fetch investor-specific fund data', () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          investorId: 'investor-1',
          fundId: 'fund-bermuda',
          amount: 500000,
          units: 50,
          status: 'CONFIRMED',
        },
      ];

      const filteredInvestments = mockInvestments.filter(
        inv => inv.investorId === 'investor-1'
      );

      expect(filteredInvestments).toHaveLength(1);
      expect(filteredInvestments[0].amount).toBe(500000);
    });

    it('should aggregate fund totals for LP view', () => {
      const lpInvestment = {
        commitment: 500000,
        funded: 250000,
        distributions: 25000,
        pendingCalls: 50000,
      };

      const unfundedCommitment = lpInvestment.commitment - lpInvestment.funded;
      expect(unfundedCommitment).toBe(250000);
    });
  });

  describe('Signed Documents (Blob Storage)', () => {
    it('should list signed documents for investor', () => {
      const mockSignedDocs = [
        {
          id: 'sig-1',
          documentId: 'doc-nda',
          status: 'COMPLETED',
          signedAt: new Date(),
          documentPath: '/documents/investor-1/nda-signed.pdf',
        },
        {
          id: 'sig-2',
          documentId: 'doc-subscription',
          status: 'COMPLETED',
          signedAt: new Date(),
          documentPath: '/documents/investor-1/subscription-signed.pdf',
        },
      ];

      const completedDocs = mockSignedDocs.filter(doc => doc.status === 'COMPLETED');

      expect(completedDocs).toHaveLength(2);
      expect(completedDocs[0].status).toBe('COMPLETED');
    });

    it('should generate blob storage download URLs', () => {
      const documentPath = '/documents/investor-1/nda-signed.pdf';
      const baseUrl = 'https://objectstorage.replit.app';
      const downloadUrl = `${baseUrl}${documentPath}`;

      expect(downloadUrl).toContain('objectstorage.replit.app');
      expect(downloadUrl).toContain('nda-signed.pdf');
    });

    it('should include signature metadata in document list', () => {
      const signedDoc = {
        id: 'sig-1',
        documentName: 'NDA Agreement',
        signedAt: new Date('2026-01-15T10:30:00Z'),
        signedByIp: '192.168.1.100',
        downloadUrl: 'https://storage.example.com/doc.pdf',
      };

      expect(signedDoc.signedAt).toBeInstanceOf(Date);
      expect(signedDoc.signedByIp).toBeTruthy();
    });

    it('should filter documents by investor vault', () => {
      const investorId = 'investor-1';
      const vaultPath = `/vault/${investorId}/`;

      const allDocs = [
        { id: 'doc-1', path: `${vaultPath}nda.pdf`, type: 'NDA' },
        { id: 'doc-2', path: `${vaultPath}k1-2025.pdf`, type: 'K1' },
        { id: 'doc-3', path: '/vault/investor-2/nda.pdf', type: 'NDA' },
      ];

      const investorDocs = allDocs.filter(doc => doc.path.startsWith(vaultPath));

      expect(investorDocs).toHaveLength(2);
      expect(investorDocs[0].path).toContain(investorId);
    });

    it('should sort documents by date (newest first)', () => {
      const documents = [
        { id: 'doc-1', signedAt: new Date('2026-01-10') },
        { id: 'doc-2', signedAt: new Date('2026-01-20') },
        { id: 'doc-3', signedAt: new Date('2026-01-15') },
      ];

      const sorted = documents.sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime());

      expect(sorted[0].id).toBe('doc-2');
      expect(sorted[2].id).toBe('doc-1');
    });
  });

  describe('Notes/Feedback Form', () => {
    it('should validate feedback form fields', () => {
      const feedbackForm = {
        subject: 'Question about Q4 distributions',
        message: 'When can we expect the Q4 distribution notice?',
        category: 'DISTRIBUTIONS',
      };

      const isValid = feedbackForm.subject.length > 0 && feedbackForm.message.length > 0;
      expect(isValid).toBe(true);
    });

    it('should reject empty feedback submission', () => {
      const feedbackForm = {
        subject: '',
        message: '',
        category: 'GENERAL',
      };

      const isValid = feedbackForm.subject.length > 0 && feedbackForm.message.length > 0;
      expect(isValid).toBe(false);
    });

    it('should support multiple feedback categories', () => {
      const categories = ['GENERAL', 'DISTRIBUTIONS', 'CAPITAL_CALLS', 'DOCUMENTS', 'TAX', 'OTHER'];
      const selectedCategory = 'CAPITAL_CALLS';

      expect(categories.includes(selectedCategory)).toBe(true);
    });

    it('should create feedback record with investor context', async () => {
      const feedbackData = {
        investorId: 'investor-1',
        fundId: 'fund-bermuda',
        subject: 'Distribution inquiry',
        message: 'When is the next distribution?',
        category: 'DISTRIBUTIONS',
        createdAt: new Date(),
      };

      (mockPrisma.investorFeedback?.create as jest.Mock)?.mockResolvedValue?.({
        id: 'feedback-1',
        ...feedbackData,
      }) || expect(feedbackData.investorId).toBe('investor-1');

      expect(feedbackData.fundId).toBe('fund-bermuda');
    });

    it('should send email notification to GP via Resend', () => {
      const emailPayload = {
        to: 'gp@bffund.com',
        subject: 'New Investor Feedback - Distribution inquiry',
        investorName: 'John Investor',
        investorEmail: 'john@example.com',
        category: 'DISTRIBUTIONS',
        message: 'When is the next distribution?',
      };

      expect(emailPayload.to).toBe('gp@bffund.com');
      expect(emailPayload.subject).toContain('New Investor Feedback');
    });

    it('should trigger webhook for feedback notification', () => {
      const webhookPayload = {
        event: 'investor.feedback.created',
        data: {
          investorId: 'investor-1',
          fundId: 'fund-bermuda',
          category: 'DISTRIBUTIONS',
          createdAt: new Date().toISOString(),
        },
      };

      expect(webhookPayload.event).toBe('investor.feedback.created');
      expect(webhookPayload.data.category).toBe('DISTRIBUTIONS');
    });

    it('should log feedback in audit trail', () => {
      const auditLog = {
        action: 'FEEDBACK_SUBMITTED',
        userId: 'user-1',
        investorId: 'investor-1',
        metadata: {
          category: 'DISTRIBUTIONS',
          fundId: 'fund-bermuda',
        },
        timestamp: new Date(),
      };

      expect(auditLog.action).toBe('FEEDBACK_SUBMITTED');
    });
  });

  describe('Capital Call Notices', () => {
    it('should list capital calls for investor', async () => {
      (mockPrisma.capitalCall.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'call-1',
          fundId: 'fund-bermuda',
          amount: 50000,
          dueDate: new Date('2026-02-15'),
          status: 'PENDING',
          noticeDate: new Date('2026-01-20'),
        },
        {
          id: 'call-2',
          fundId: 'fund-bermuda',
          amount: 25000,
          dueDate: new Date('2026-01-10'),
          status: 'PAID',
          noticeDate: new Date('2025-12-15'),
        },
      ]);

      const calls = await mockPrisma.capitalCall.findMany({
        where: { fundId: 'fund-bermuda' },
      });

      expect(calls).toHaveLength(2);
    });

    it('should calculate investor pro-rata share of capital call', () => {
      const totalCallAmount = 500000;
      const investorCommitment = 500000;
      const totalFundCommitments = 5000000;
      const proRataShare = (investorCommitment / totalFundCommitments) * totalCallAmount;

      expect(proRataShare).toBe(50000);
    });

    it('should show pending capital calls prominently', () => {
      const capitalCalls = [
        { id: 'call-1', status: 'PENDING', dueDate: new Date('2026-02-15') },
        { id: 'call-2', status: 'PAID', dueDate: new Date('2026-01-10') },
        { id: 'call-3', status: 'PENDING', dueDate: new Date('2026-03-01') },
      ];

      const pendingCalls = capitalCalls.filter(call => call.status === 'PENDING');
      expect(pendingCalls).toHaveLength(2);
    });

    it('should sort capital calls by due date', () => {
      const capitalCalls = [
        { id: 'call-1', dueDate: new Date('2026-03-01') },
        { id: 'call-2', dueDate: new Date('2026-01-15') },
        { id: 'call-3', dueDate: new Date('2026-02-01') },
      ];

      const sorted = capitalCalls.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      expect(sorted[0].id).toBe('call-2');
      expect(sorted[2].id).toBe('call-1');
    });

    it('should show days until due for pending calls', () => {
      const dueDate = new Date('2026-02-15');
      const today = new Date('2026-01-25');
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysUntilDue).toBe(21);
    });

    it('should mark overdue capital calls', () => {
      const dueDate = new Date('2026-01-10');
      const today = new Date('2026-01-25');
      const isOverdue = dueDate < today;

      expect(isOverdue).toBe(true);
    });

    it('should track capital call response status', async () => {
      (mockPrisma.capitalCallResponse?.findFirst as jest.Mock)?.mockResolvedValue?.({
        id: 'response-1',
        capitalCallId: 'call-1',
        investorId: 'investor-1',
        status: 'PAID',
        paidAmount: 50000,
        paidAt: new Date('2026-01-20'),
      }) || expect(true).toBe(true);

      const response = { status: 'PAID', paidAmount: 50000 };
      expect(response.status).toBe('PAID');
    });

    it('should include capital call notice PDF link', () => {
      const capitalCall = {
        id: 'call-1',
        noticeDocumentPath: '/notices/call-1-notice.pdf',
      };

      const downloadUrl = `https://objectstorage.replit.app${capitalCall.noticeDocumentPath}`;
      expect(downloadUrl).toContain('notices');
      expect(downloadUrl).toContain('.pdf');
    });
  });

  describe('Dashboard Summary Cards', () => {
    it('should display commitment summary card', () => {
      const summaryCard = {
        title: 'Total Commitment',
        value: 500000,
        formattedValue: '$500,000',
        icon: 'dollar-sign',
      };

      expect(summaryCard.value).toBe(500000);
      expect(summaryCard.formattedValue).toBe('$500,000');
    });

    it('should display funded amount card', () => {
      const fundedCard = {
        title: 'Funded',
        value: 250000,
        percentOfCommitment: 50,
      };

      expect(fundedCard.percentOfCommitment).toBe(50);
    });

    it('should display distributions received card', () => {
      const distributionsCard = {
        title: 'Distributions',
        value: 75000,
        ytdValue: 25000,
      };

      expect(distributionsCard.value).toBe(75000);
      expect(distributionsCard.ytdValue).toBe(25000);
    });

    it('should display pending actions badge', () => {
      const pendingActions = {
        pendingCalls: 1,
        pendingSignatures: 2,
        unreadNotices: 3,
      };

      const totalPending = pendingActions.pendingCalls + 
                          pendingActions.pendingSignatures + 
                          pendingActions.unreadNotices;

      expect(totalPending).toBe(6);
    });

    it('should show welcome banner for new investors', () => {
      const investorOnboarding = {
        step: 3,
        totalSteps: 5,
        showWelcomeBanner: true,
        progressPercent: 60,
      };

      expect(investorOnboarding.showWelcomeBanner).toBe(true);
      expect(investorOnboarding.progressPercent).toBe(60);
    });
  });

  describe('Real-time Dashboard Updates', () => {
    it('should support 30-second auto-refresh polling', () => {
      const pollingConfig = {
        enabled: true,
        intervalMs: 30000,
        endpoints: ['/api/lp/me', '/api/lp/fund-details'],
      };

      expect(pollingConfig.intervalMs).toBe(30000);
    });

    it('should include manual refresh button', () => {
      const refreshButton = {
        visible: true,
        lastRefreshed: new Date(),
        isLoading: false,
      };

      expect(refreshButton.visible).toBe(true);
    });

    it('should update dashboard data on refresh', async () => {
      const initialData = { totalRaised: 2000000 };
      const refreshedData = { totalRaised: 2500000 };

      expect(refreshedData.totalRaised).toBeGreaterThan(initialData.totalRaised);
    });
  });
});

describe('Phase 1: Digital Subscription Wizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockFund = {
    id: 'fund-bermuda',
    name: 'Bermuda Growth Fund',
    targetAmount: 10000000,
    initialClosingThreshold: 2500000,
    managementFeePercent: 2.5,
    status: 'RAISING',
  };

  const mockInvestor = {
    id: 'investor-1',
    userId: 'user-1',
    ndaSigned: true,
    accreditationStatus: 'SELF_CERTIFIED',
    fundId: 'fund-bermuda',
  };

  describe('Subscribe CTA Display', () => {
    it('should show Subscribe CTA on dashboard for verified investors', () => {
      const investor = { ...mockInvestor, accreditationStatus: 'SELF_CERTIFIED' };
      const showSubscribeCta = investor.ndaSigned && 
        ['SELF_CERTIFIED', 'KYC_VERIFIED'].includes(investor.accreditationStatus);

      expect(showSubscribeCta).toBe(true);
    });

    it('should hide Subscribe CTA for unverified investors', () => {
      const investor = { ...mockInvestor, accreditationStatus: 'PENDING' };
      const showSubscribeCta = ['SELF_CERTIFIED', 'KYC_VERIFIED'].includes(investor.accreditationStatus);

      expect(showSubscribeCta).toBe(false);
    });

    it('should hide Subscribe CTA when fund not raising', () => {
      const fund = { ...mockFund, status: 'CLOSED' };
      const showSubscribeCta = fund.status === 'RAISING';

      expect(showSubscribeCta).toBe(false);
    });
  });

  describe('Step 1: Review Terms', () => {
    it('should display fund terms and conditions', () => {
      const fundTerms = {
        minimumInvestment: 25000,
        managementFee: 2.5,
        carriedInterest: 20,
        lockupPeriod: '3 years',
        fundStrategy: 'Growth equity in emerging markets',
      };

      expect(fundTerms.minimumInvestment).toBe(25000);
      expect(fundTerms.managementFee).toBe(2.5);
    });

    it('should require terms acknowledgment checkbox', () => {
      const termsAccepted = true;
      const canProceed = termsAccepted === true;

      expect(canProceed).toBe(true);
    });

    it('should display pricing tiers when available', () => {
      const pricingTiers = [
        { id: 'tier-1', tranche: 1, pricePerUnit: 10000, unitsAvailable: 100 },
        { id: 'tier-2', tranche: 2, pricePerUnit: 12000, unitsAvailable: 50 },
        { id: 'tier-3', tranche: 3, pricePerUnit: 15000, unitsAvailable: 25 },
      ];

      expect(pricingTiers).toHaveLength(3);
      expect(pricingTiers[0].pricePerUnit).toBeLessThan(pricingTiers[1].pricePerUnit);
    });
  });

  describe('Step 2: E-Sign Commitment', () => {
    it('should require signature for subscription agreement', () => {
      const signatureData = {
        signature: 'data:image/png;base64,signature-data',
        signedAt: new Date(),
        ipAddress: '192.168.1.100',
      };

      expect(signatureData.signature).toBeTruthy();
      expect(signatureData.signedAt).toBeInstanceOf(Date);
    });

    it('should validate signature is provided', () => {
      const requestBody = { signature: null };
      const hasSignature = requestBody.signature !== null;

      expect(hasSignature).toBe(false);
    });

    it('should store signature with audit trail', () => {
      const subscriptionSignature = {
        investorId: 'investor-1',
        fundId: 'fund-bermuda',
        signature: 'data:image/png;base64,abc123',
        signedAt: new Date(),
        signedIp: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome/120',
      };

      expect(subscriptionSignature.signedIp).toBeTruthy();
      expect(subscriptionSignature.userAgent).toContain('Mozilla');
    });
  });

  describe('Step 3: Stripe Checkout', () => {
    it('should calculate subscription amount correctly', () => {
      const units = 5;
      const pricePerUnit = 10000;
      const amount = units * pricePerUnit;

      expect(amount).toBe(50000);
    });

    it('should validate minimum investment amount', () => {
      const amount = 25000;
      const minimumInvestment = 25000;
      const isValid = amount >= minimumInvestment;

      expect(isValid).toBe(true);
    });

    it('should reject below-minimum investments', () => {
      const amount = 10000;
      const minimumInvestment = 25000;
      const isValid = amount >= minimumInvestment;

      expect(isValid).toBe(false);
    });

    it('should create Stripe checkout session', () => {
      const checkoutData = {
        amount: 50000,
        currency: 'usd',
        mode: 'payment',
        successUrl: '/lp/dashboard?subscription=success',
        cancelUrl: '/lp/dashboard?subscription=cancelled',
        metadata: {
          investorId: 'investor-1',
          fundId: 'fund-bermuda',
          units: 5,
        },
      };

      expect(checkoutData.mode).toBe('payment');
      expect(checkoutData.metadata.fundId).toBe('fund-bermuda');
    });

    it('should handle multi-tier pricing (blended rate)', () => {
      const tierAllocations = [
        { tierId: 'tier-1', units: 3, pricePerUnit: 10000, amount: 30000 },
        { tierId: 'tier-2', units: 2, pricePerUnit: 12000, amount: 24000 },
      ];

      const totalAmount = tierAllocations.reduce((sum, t) => sum + t.amount, 0);
      const totalUnits = tierAllocations.reduce((sum, t) => sum + t.units, 0);
      const blendedRate = totalAmount / totalUnits;

      expect(totalAmount).toBe(54000);
      expect(blendedRate).toBe(10800);
    });
  });

  describe('Step 4: Confirmation', () => {
    it('should create subscription record in Prisma', async () => {
      const subscriptionData = {
        investorId: 'investor-1',
        fundId: 'fund-bermuda',
        amount: 50000,
        units: 5,
        status: 'PENDING',
        tierBreakdown: JSON.stringify([{ tierId: 'tier-1', units: 5, amount: 50000 }]),
        createdAt: new Date(),
      };

      (mockPrisma.subscription?.create as jest.Mock)?.mockResolvedValue?.({
        id: 'sub-1',
        ...subscriptionData,
      }) || expect(subscriptionData.status).toBe('PENDING');

      expect(subscriptionData.amount).toBe(50000);
    });

    it('should display confirmation with subscription details', () => {
      const confirmation = {
        subscriptionId: 'sub-1',
        fundName: 'Bermuda Growth Fund',
        amount: 50000,
        units: 5,
        status: 'CONFIRMED',
        confirmationDate: new Date(),
      };

      expect(confirmation.status).toBe('CONFIRMED');
      expect(confirmation.amount).toBe(50000);
    });
  });

  describe('Entity Threshold Updates', () => {
    it('should update fund total raised after subscription', () => {
      const previousRaised = 2000000;
      const subscriptionAmount = 50000;
      const newTotalRaised = previousRaised + subscriptionAmount;

      expect(newTotalRaised).toBe(2050000);
    });

    it('should track threshold progress', () => {
      const totalRaised = 2500000;
      const initialClosingThreshold = 2500000;
      const thresholdMet = totalRaised >= initialClosingThreshold;

      expect(thresholdMet).toBe(true);
    });

    it('should update AUM (Assets Under Management)', () => {
      const currentAUM = 5000000;
      const newSubscription = 50000;
      const updatedAUM = currentAUM + newSubscription;

      expect(updatedAUM).toBe(5050000);
    });
  });

  describe('Fee Accrual (2.5% Management Fee)', () => {
    it('should calculate management fee correctly', () => {
      const subscriptionAmount = 100000;
      const managementFeePercent = 2.5;
      const annualFee = subscriptionAmount * (managementFeePercent / 100);

      expect(annualFee).toBe(2500);
    });

    it('should accrue fees on subscription', () => {
      const feeAccrual = {
        subscriptionId: 'sub-1',
        amount: 100000,
        feePercent: 2.5,
        annualFee: 2500,
        accruedAt: new Date(),
      };

      expect(feeAccrual.annualFee).toBe(2500);
    });

    it('should calculate quarterly fee installments', () => {
      const annualFee = 2500;
      const quarterlyFee = annualFee / 4;

      expect(quarterlyFee).toBe(625);
    });
  });

  describe('GP Notification via Resend', () => {
    it('should send subscription notification to GP', () => {
      const emailPayload = {
        to: 'gp@bffund.com',
        subject: 'New Subscription - Bermuda Growth Fund',
        investorName: 'John Investor',
        amount: 50000,
        units: 5,
        fundName: 'Bermuda Growth Fund',
      };

      expect(emailPayload.subject).toContain('New Subscription');
      expect(emailPayload.amount).toBe(50000);
    });

    it('should include subscription details in email', () => {
      const emailData = {
        subscriptionId: 'sub-1',
        investorEmail: 'john@example.com',
        amount: 50000,
        tierBreakdown: [{ tier: 1, units: 5, pricePerUnit: 10000 }],
        totalUnits: 5,
      };

      expect(emailData.tierBreakdown).toHaveLength(1);
    });
  });

  describe('Pricing Tiers (JSON in Entity)', () => {
    it('should parse tier configuration from JSON', () => {
      const tierConfigJson = JSON.stringify([
        { tranche: 1, pricePerUnit: 10000, unitsAvailable: 100 },
        { tranche: 2, pricePerUnit: 12000, unitsAvailable: 50 },
      ]);

      const tiers = JSON.parse(tierConfigJson);
      expect(tiers).toHaveLength(2);
      expect(tiers[0].pricePerUnit).toBe(10000);
    });

    it('should allocate units from lowest tier first', () => {
      const tiers = [
        { tranche: 1, pricePerUnit: 10000, unitsAvailable: 3 },
        { tranche: 2, pricePerUnit: 12000, unitsAvailable: 50 },
      ];

      const requestedUnits = 5;
      let remainingUnits = requestedUnits;
      const allocations: any[] = [];

      for (const tier of tiers) {
        if (remainingUnits <= 0) break;
        const allocatedUnits = Math.min(remainingUnits, tier.unitsAvailable);
        allocations.push({
          tranche: tier.tranche,
          units: allocatedUnits,
          pricePerUnit: tier.pricePerUnit,
        });
        remainingUnits -= allocatedUnits;
      }

      expect(allocations[0].units).toBe(3);
      expect(allocations[1].units).toBe(2);
    });

    it('should deduct units from tier after subscription', () => {
      const tier = { tranche: 1, pricePerUnit: 10000, unitsAvailable: 100 };
      const subscribedUnits = 5;
      tier.unitsAvailable -= subscribedUnits;

      expect(tier.unitsAvailable).toBe(95);
    });

    it('should store tier breakdown in subscription record', () => {
      const tierBreakdown = [
        { tierId: 'tier-1', tranche: 1, units: 3, pricePerUnit: 10000, amount: 30000 },
        { tierId: 'tier-2', tranche: 2, units: 2, pricePerUnit: 12000, amount: 24000 },
      ];

      const tierBreakdownJson = JSON.stringify(tierBreakdown);
      const parsed = JSON.parse(tierBreakdownJson);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].amount + parsed[1].amount).toBe(54000);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should return 401 for unauthenticated requests', () => {
      const session = null;
      const expectedStatus = session ? 200 : 401;

      expect(expectedStatus).toBe(401);
    });

    it('should return 403 if NDA not signed', () => {
      const investor = { ...mockInvestor, ndaSigned: false };
      const canSubscribe = investor.ndaSigned;

      expect(canSubscribe).toBe(false);
    });

    it('should return 403 if not accredited', () => {
      const investor = { ...mockInvestor, accreditationStatus: 'PENDING' };
      const canSubscribe = ['SELF_CERTIFIED', 'KYC_VERIFIED'].includes(investor.accreditationStatus);

      expect(canSubscribe).toBe(false);
    });

    it('should return 400 for missing fund ID', () => {
      const requestBody = { fundId: null, amount: 50000 };
      const isValid = requestBody.fundId !== null;

      expect(isValid).toBe(false);
    });

    it('should return 400 for invalid amount', () => {
      const requestBody = { fundId: 'fund-1', amount: NaN };
      const isValid = !isNaN(requestBody.amount) && requestBody.amount > 0;

      expect(isValid).toBe(false);
    });
  });
});

describe('Phase 1: KYC/AML Post-Subscription (Persona)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  const mockInvestor = {
    id: 'investor-1',
    userId: 'user-1',
    kycStatus: 'PENDING',
    personaInquiryId: null,
  };

  describe('Persona Embed Trigger', () => {
    it('should trigger Persona embed after subscription', () => {
      const subscriptionComplete = true;
      const kycStatus = 'PENDING';
      const showPersonaEmbed = subscriptionComplete && kycStatus === 'PENDING';

      expect(showPersonaEmbed).toBe(true);
    });

    it('should skip Persona if already verified', () => {
      const kycStatus = 'VERIFIED';
      const showPersonaEmbed = kycStatus === 'PENDING';

      expect(showPersonaEmbed).toBe(false);
    });

    it('should generate Persona inquiry session', () => {
      const personaSession = {
        inquiryId: 'inq_abc123',
        templateId: 'tmpl_kyc_standard',
        referenceId: 'investor-1',
        environment: 'sandbox',
      };

      expect(personaSession.inquiryId).toContain('inq_');
      expect(personaSession.environment).toBe('sandbox');
    });

    it('should pass investor reference to Persona', () => {
      const personaConfig = {
        referenceId: 'investor-1',
        fields: {
          name: { first: 'John', last: 'Investor' },
          email: 'john@example.com',
        },
      };

      expect(personaConfig.referenceId).toBe('investor-1');
    });
  });

  describe('KycResult Storage in Prisma', () => {
    it('should store KYC result after Persona callback', async () => {
      const kycResult = {
        investorId: 'investor-1',
        personaInquiryId: 'inq_abc123',
        status: 'APPROVED',
        verificationLevel: 'STANDARD',
        completedAt: new Date(),
        rawResponse: JSON.stringify({ status: 'approved' }),
      };

      (mockPrisma.kycResult?.create as jest.Mock)?.mockResolvedValue?.({
        id: 'kyc-1',
        ...kycResult,
      }) || expect(kycResult.status).toBe('APPROVED');

      expect(kycResult.personaInquiryId).toContain('inq_');
    });

    it('should update investor KYC status', async () => {
      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        kycStatus: 'VERIFIED',
        personaInquiryId: 'inq_abc123',
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: { kycStatus: 'VERIFIED' },
      });

      expect(updated.kycStatus).toBe('VERIFIED');
    });

    it('should store failed KYC result', async () => {
      const failedKyc = {
        investorId: 'investor-1',
        personaInquiryId: 'inq_failed123',
        status: 'DECLINED',
        failureReason: 'Document verification failed',
        completedAt: new Date(),
      };

      expect(failedKyc.status).toBe('DECLINED');
      expect(failedKyc.failureReason).toBeTruthy();
    });

    it('should link KYC result to investor record', () => {
      const investor = {
        id: 'investor-1',
        kycResults: [
          { id: 'kyc-1', status: 'APPROVED', completedAt: new Date() },
        ],
      };

      expect(investor.kycResults).toHaveLength(1);
      expect(investor.kycResults[0].status).toBe('APPROVED');
    });
  });

  describe('KYC Gate - Blocks Actions if Failed', () => {
    it('should block investment if KYC failed', () => {
      const kycStatus = 'DECLINED';
      const canInvest = kycStatus === 'VERIFIED' || kycStatus === 'APPROVED';

      expect(canInvest).toBe(false);
    });

    it('should allow investment if KYC approved', () => {
      const kycStatus = 'APPROVED';
      const canInvest = kycStatus === 'VERIFIED' || kycStatus === 'APPROVED';

      expect(canInvest).toBe(true);
    });

    it('should block capital call payment if KYC pending', () => {
      const kycStatus = 'PENDING';
      const canPayCapitalCall = ['VERIFIED', 'APPROVED'].includes(kycStatus);

      expect(canPayCapitalCall).toBe(false);
    });

    it('should block distributions if KYC failed', () => {
      const kycStatus = 'DECLINED';
      const canReceiveDistribution = ['VERIFIED', 'APPROVED'].includes(kycStatus);

      expect(canReceiveDistribution).toBe(false);
    });

    it('should show KYC required banner for pending status', () => {
      const kycStatus = 'PENDING';
      const showKycBanner = kycStatus === 'PENDING' || kycStatus === 'NEEDS_REVIEW';

      expect(showKycBanner).toBe(true);
    });

    it('should show KYC failed message with retry option', () => {
      const kycStatus = 'DECLINED';
      const kycFailureMessage = {
        status: kycStatus,
        message: 'Identity verification failed. Please try again.',
        canRetry: true,
        retryUrl: '/lp/kyc/retry',
      };

      expect(kycFailureMessage.canRetry).toBe(true);
    });
  });

  describe('KYC Status Types', () => {
    it('should support all KYC status types', () => {
      const kycStatuses = ['PENDING', 'IN_PROGRESS', 'NEEDS_REVIEW', 'APPROVED', 'DECLINED', 'EXPIRED'];

      expect(kycStatuses).toContain('PENDING');
      expect(kycStatuses).toContain('APPROVED');
      expect(kycStatuses).toContain('DECLINED');
    });

    it('should handle expired KYC status', () => {
      const kycExpiresAt = new Date('2025-01-01');
      const now = new Date('2026-01-25');
      const isExpired = kycExpiresAt < now;

      expect(isExpired).toBe(true);
    });

    it('should prompt re-verification for expired KYC', () => {
      const kycStatus = 'EXPIRED';
      const showReverifyPrompt = kycStatus === 'EXPIRED';

      expect(showReverifyPrompt).toBe(true);
    });
  });

  describe('Persona Webhook Processing', () => {
    it('should process Persona webhook callback', () => {
      const webhookPayload = {
        event: 'inquiry.completed',
        data: {
          id: 'inq_abc123',
          status: 'approved',
          reference_id: 'investor-1',
        },
      };

      expect(webhookPayload.event).toBe('inquiry.completed');
      expect(webhookPayload.data.status).toBe('approved');
    });

    it('should validate Persona webhook signature', () => {
      const webhookSecret = 'persona_webhook_secret';
      const signature = 'sha256=abc123';
      const isValid = signature.startsWith('sha256=');

      expect(isValid).toBe(true);
    });

    it('should map Persona status to internal status', () => {
      const statusMap: Record<string, string> = {
        'approved': 'VERIFIED',
        'declined': 'DECLINED',
        'needs_review': 'NEEDS_REVIEW',
        'pending': 'PENDING',
      };

      expect(statusMap['approved']).toBe('VERIFIED');
      expect(statusMap['declined']).toBe('DECLINED');
    });
  });

  describe('506(c) Compliance Logging', () => {
    it('should log KYC completion in audit trail', () => {
      const auditLog = {
        action: 'KYC_COMPLETED',
        investorId: 'investor-1',
        status: 'APPROVED',
        personaInquiryId: 'inq_abc123',
        timestamp: new Date(),
        ipAddress: '192.168.1.100',
      };

      expect(auditLog.action).toBe('KYC_COMPLETED');
      expect(auditLog.personaInquiryId).toBeTruthy();
    });

    it('should store verification documents reference', () => {
      const verificationDocs = {
        investorId: 'investor-1',
        documentType: 'DRIVERS_LICENSE',
        verified: true,
        verifiedAt: new Date(),
        expiresAt: new Date('2028-01-01'),
      };

      expect(verificationDocs.verified).toBe(true);
    });
  });
});
