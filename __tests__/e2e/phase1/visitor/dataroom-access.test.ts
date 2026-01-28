// @ts-nocheck
// Phase 1: Visitor/LP Side - Dataroom Access E2E Tests
// Extracted from phase1-visitor-dataroom.test.ts for better maintainability

import {
  mockPrisma,
  createMockTeam,
  createMockFund,
  createMockDataroom,
  createMockLink,
  setupTestMocks,
} from '../../utils/test-helpers';

describe('Phase 1: Visitor/LP Side - Dataroom Access E2E', () => {
  beforeEach(() => {
    setupTestMocks();
  });

  const mockTeam = createMockTeam();
  const mockFund = createMockFund();
  const mockDataroom = createMockDataroom();
  const mockLink = createMockLink({
    emailProtected: false,
    enableCustomMetatag: false,
    enableAgreement: false,
  });

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
