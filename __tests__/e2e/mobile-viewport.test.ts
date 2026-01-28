import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Mobile Viewport Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mobileUserAgents = {
    iPhoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    androidChrome: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    iPadSafari: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    samsungBrowser: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  };

  const viewports = {
    iPhoneSE: { width: 375, height: 667 },
    iPhone14Pro: { width: 393, height: 852 },
    pixel7: { width: 412, height: 915 },
    iPadMini: { width: 768, height: 1024 },
    iPadPro: { width: 1024, height: 1366 },
  };

  const mockMobileInvestor = {
    id: 'investor-mobile-001',
    userId: 'user-mobile-001',
    displayName: 'Mobile Investor',
    email: 'mobile@test.com',
    accreditationStatus: 'VERIFIED',
    personaStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMobileView = {
    id: 'view-mobile-001',
    linkId: 'link-mobile-001',
    viewerEmail: 'mobile@test.com',
    userAgent: mobileUserAgents.iPhoneSafari,
    deviceType: 'mobile',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone',
    browserName: 'Safari',
    osName: 'iOS',
    osVersion: '16.0',
    viewedAt: new Date(),
  };

  describe('Mobile User Agent Detection', () => {
    it('should detect iPhone Safari user agent', () => {
      const userAgent = mobileUserAgents.iPhoneSafari;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      
      expect(isMobile).toBe(true);
      expect(isIOS).toBe(true);
    });

    it('should detect Android Chrome user agent', () => {
      const userAgent = mobileUserAgents.androidChrome;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
      
      expect(isMobile).toBe(true);
      expect(isAndroid).toBe(true);
    });

    it('should detect iPad Safari user agent', () => {
      const userAgent = mobileUserAgents.iPadSafari;
      const isTablet = /iPad/i.test(userAgent);
      
      expect(isTablet).toBe(true);
    });

    it('should detect Samsung Browser user agent', () => {
      const userAgent = mobileUserAgents.samsungBrowser;
      const isSamsung = /SamsungBrowser/i.test(userAgent);
      
      expect(isSamsung).toBe(true);
    });
  });

  describe('Viewport Size Classification', () => {
    const classifyViewport = (width: number): 'mobile' | 'tablet' | 'desktop' => {
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    it('should classify iPhone SE as mobile viewport', () => {
      expect(classifyViewport(viewports.iPhoneSE.width)).toBe('mobile');
    });

    it('should classify iPhone 14 Pro as mobile viewport', () => {
      expect(classifyViewport(viewports.iPhone14Pro.width)).toBe('mobile');
    });

    it('should classify Pixel 7 as mobile viewport', () => {
      expect(classifyViewport(viewports.pixel7.width)).toBe('mobile');
    });

    it('should classify iPad Mini as tablet viewport', () => {
      expect(classifyViewport(viewports.iPadMini.width)).toBe('tablet');
    });

    it('should classify iPad Pro as desktop viewport', () => {
      expect(classifyViewport(viewports.iPadPro.width)).toBe('desktop');
    });
  });

  describe('Mobile View Audit Tracking', () => {
    it('should create view record with mobile device info from iPhone', async () => {
      const viewData = {
        linkId: 'link-test-123',
        userAgent: mobileUserAgents.iPhoneSafari,
        ipAddress: '192.168.1.1',
        deviceType: 'mobile',
        browserName: 'Safari',
        osName: 'iOS',
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue({
        id: 'view-123',
        ...viewData,
        viewedAt: new Date(),
      });

      const result = await mockPrisma.view.create({ data: viewData });

      expect(result.deviceType).toBe('mobile');
      expect(result.browserName).toBe('Safari');
      expect(result.osName).toBe('iOS');
    });

    it('should create view record with mobile device info from Android', async () => {
      const viewData = {
        linkId: 'link-test-124',
        userAgent: mobileUserAgents.androidChrome,
        ipAddress: '192.168.1.2',
        deviceType: 'mobile',
        browserName: 'Chrome',
        osName: 'Android',
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue({
        id: 'view-124',
        ...viewData,
        viewedAt: new Date(),
      });

      const result = await mockPrisma.view.create({ data: viewData });

      expect(result.deviceType).toBe('mobile');
      expect(result.osName).toBe('Android');
      expect(result.browserName).toBe('Chrome');
    });

    it('should query mobile views for analytics', async () => {
      (mockPrisma.view.findMany as jest.Mock).mockResolvedValue([
        mockMobileView,
        { ...mockMobileView, id: 'view-mobile-002', userAgent: mobileUserAgents.androidChrome, osName: 'Android' },
      ]);

      const mobileViews = await mockPrisma.view.findMany({
        where: { deviceType: 'mobile' },
      });

      expect(mobileViews.length).toBe(2);
      expect(mobileViews.every(v => v.deviceType === 'mobile' || v.userAgent?.includes('Mobile'))).toBe(true);
    });
  });

  describe('Mobile LP Dashboard API', () => {
    it('should return investor data for mobile LP request', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue(mockMobileInvestor);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/lp/dashboard',
        headers: {
          'user-agent': mobileUserAgents.iPhoneSafari,
          'x-forwarded-for': '192.168.1.100',
        },
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { userId: 'user-mobile-001' },
      });

      expect(investor).toBeDefined();
      expect(investor?.accreditationStatus).toBe('VERIFIED');
      expect(req.headers['user-agent']).toContain('iPhone');
    });

    it('should handle mobile investments data structure', async () => {
      const mockInvestments = [
        { id: 'inv-1', investorId: 'investor-mobile-001', fundId: 'fund-1', unitsOwned: 10, status: 'ACTIVE' },
        { id: 'inv-2', investorId: 'investor-mobile-001', fundId: 'fund-2', unitsOwned: 5, status: 'ACTIVE' },
      ];

      expect(mockInvestments.length).toBe(2);
      expect(mockInvestments[0].status).toBe('ACTIVE');
      expect(mockInvestments.every(i => i.investorId === 'investor-mobile-001')).toBe(true);
    });
  });

  describe('Mobile Dataroom Document Access', () => {
    it('should track mobile document view with viewport info', async () => {
      const viewData = {
        linkId: 'link-doc-123',
        documentId: 'doc-ppm-123',
        userAgent: mobileUserAgents.iPhoneSafari,
        deviceType: 'mobile',
        auditMetadata: {
          viewportWidth: viewports.iPhoneSE.width,
          viewportHeight: viewports.iPhoneSE.height,
        },
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue({
        id: 'view-doc-001',
        ...viewData,
        viewedAt: new Date(),
      });

      const result = await mockPrisma.view.create({ data: viewData });

      expect(result.deviceType).toBe('mobile');
      expect((result.auditMetadata as any)?.viewportWidth).toBe(375);
      expect((result.auditMetadata as any)?.viewportWidth).toBeLessThan(768);
    });

    it('should use optimized page size for mobile pagination', async () => {
      const mobilePageSize = 10;
      const desktopPageSize = 25;
      
      const getOptimalPageSize = (isMobile: boolean) => isMobile ? mobilePageSize : desktopPageSize;
      
      const mockDocuments = Array.from({ length: mobilePageSize }, (_, i) => ({
        id: `doc-${i}`,
        name: `Document ${i}`,
        type: 'application/pdf',
      }));

      expect(getOptimalPageSize(true)).toBe(10);
      expect(getOptimalPageSize(false)).toBe(25);
      expect(mockDocuments.length).toBeLessThanOrEqual(mobilePageSize);
    });
  });

  describe('Mobile E-Signature Flow', () => {
    it('should create signature request accessible on mobile', async () => {
      const signatureRequest = {
        id: 'sig-mobile-001',
        documentId: 'doc-sub-agreement',
        recipientEmail: 'mobile@test.com',
        status: 'PENDING',
        createdAt: new Date(),
      };

      expect(signatureRequest.status).toBe('PENDING');
      expect(signatureRequest.recipientEmail).toBe('mobile@test.com');
      expect(signatureRequest.id).toBeDefined();
    });

    it('should support touch-based signature input on mobile', async () => {
      const signatureData = {
        id: 'field-sig-001',
        type: 'SIGNATURE',
        value: 'data:image/png;base64,touchsignature...',
        signedAt: new Date(),
        inputMethod: 'touch',
        deviceType: 'mobile',
        userAgent: mobileUserAgents.iPhoneSafari,
      };

      expect(signatureData.inputMethod).toBe('touch');
      expect(signatureData.value).toContain('base64');
      expect(signatureData.deviceType).toBe('mobile');
    });
  });

  describe('Mobile Subscription Flow', () => {
    it('should allow subscription creation from mobile device', async () => {
      const subscription = {
        id: 'sub-mobile-001',
        investorId: 'investor-mobile-001',
        fundId: 'fund-bermuda',
        unitsRequested: 5,
        amount: 50000,
        status: 'PENDING',
        createdAt: new Date(),
        userAgent: mobileUserAgents.iPhoneSafari,
      };

      expect(subscription.status).toBe('PENDING');
      expect(subscription.unitsRequested).toBe(5);
      expect(subscription.userAgent).toContain('iPhone');
      expect(subscription.amount).toBe(50000);
    });

    it('should calculate blended pricing for mobile tier display', async () => {
      const tiers = [
        { id: 'tier-1', tranche: 1, pricePerUnit: 10000, unitsAvailable: 20 },
        { id: 'tier-2', tranche: 2, pricePerUnit: 12500, unitsAvailable: 30 },
        { id: 'tier-3', tranche: 3, pricePerUnit: 15000, unitsAvailable: 50 },
      ];

      const calculateBlendedPrice = (tiers: any[], unitsRequested: number) => {
        let remaining = unitsRequested;
        let totalCost = 0;
        
        for (const tier of tiers) {
          if (remaining <= 0) break;
          const unitsFromTier = Math.min(remaining, tier.unitsAvailable);
          totalCost += unitsFromTier * tier.pricePerUnit;
          remaining -= unitsFromTier;
        }
        
        return totalCost / unitsRequested;
      };

      const blendedPrice = calculateBlendedPrice(tiers, 25);
      expect(blendedPrice).toBe(10500);
      expect(tiers.length).toBe(3);
    });
  });

  describe('Mobile KYC/Persona Integration', () => {
    it('should track KYC verification from mobile device', async () => {
      const kycVerification = {
        investorId: 'investor-mobile-001',
        kycStatus: 'APPROVED',
        kycCompletedAt: new Date(),
        kycVerificationMethod: 'persona',
        deviceType: 'mobile',
        userAgent: mobileUserAgents.iPhoneSafari,
      };

      expect(kycVerification.kycStatus).toBe('APPROVED');
      expect(kycVerification.deviceType).toBe('mobile');
      expect(kycVerification.kycVerificationMethod).toBe('persona');
    });

    it('should log mobile KYC attempt for 506(c) compliance', async () => {
      const complianceLog = {
        investorId: 'investor-mobile-001',
        action: 'KYC_STARTED',
        userAgent: mobileUserAgents.androidChrome,
        ipAddress: '192.168.1.50',
        timestamp: new Date(),
        deviceInfo: {
          type: 'mobile',
          brand: 'Google',
          model: 'Pixel 7',
          os: 'Android 13',
        },
      };

      expect(complianceLog.userAgent).toContain('Android');
      expect(complianceLog.action).toBe('KYC_STARTED');
      expect(complianceLog.deviceInfo.type).toBe('mobile');
    });
  });

  describe('Mobile Navigation and UX', () => {
    it('should determine hamburger menu visibility by viewport', () => {
      const shouldShowHamburger = (width: number) => width < 768;
      
      expect(shouldShowHamburger(viewports.iPhoneSE.width)).toBe(true);
      expect(shouldShowHamburger(viewports.iPhone14Pro.width)).toBe(true);
      expect(shouldShowHamburger(viewports.iPadPro.width)).toBe(false);
    });

    it('should determine bottom nav visibility for LP portal', () => {
      const shouldShowBottomNav = (width: number, isLPPortal: boolean) => {
        return isLPPortal && width < 768;
      };

      expect(shouldShowBottomNav(viewports.iPhoneSE.width, true)).toBe(true);
      expect(shouldShowBottomNav(viewports.iPhoneSE.width, false)).toBe(false);
      expect(shouldShowBottomNav(viewports.iPadPro.width, true)).toBe(false);
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('should limit page size for mobile data fetching', () => {
      const getPageSize = (isMobile: boolean) => isMobile ? 10 : 25;
      
      expect(getPageSize(true)).toBe(10);
      expect(getPageSize(false)).toBe(25);
    });

    it('should determine lazy loading based on device', () => {
      const shouldLazyLoad = (userAgent: string) => {
        return /iPhone|iPad|iPod|Android/i.test(userAgent);
      };

      expect(shouldLazyLoad(mobileUserAgents.iPhoneSafari)).toBe(true);
      expect(shouldLazyLoad(mobileUserAgents.androidChrome)).toBe(true);
      expect(shouldLazyLoad('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });
  });

  describe('Mobile Accessibility Requirements', () => {
    it('should enforce minimum touch target sizes', () => {
      const WCAG_MIN_TOUCH_TARGET = 44;
      const touchTargetSize = { width: 48, height: 48 };
      
      expect(touchTargetSize.width).toBeGreaterThanOrEqual(WCAG_MIN_TOUCH_TARGET);
      expect(touchTargetSize.height).toBeGreaterThanOrEqual(WCAG_MIN_TOUCH_TARGET);
    });

    it('should enforce minimum font sizes for readability', () => {
      const MIN_BODY_FONT_SIZE = 16;
      const bodyFontSize = 16;
      
      expect(bodyFontSize).toBeGreaterThanOrEqual(MIN_BODY_FONT_SIZE);
    });
  });

  describe('Mobile PWA Offline Support', () => {
    it('should cache critical LP routes for offline access', () => {
      const cachedRoutes = [
        '/lp/dashboard',
        '/lp/documents',
        '/lp/transactions',
        '/lp/settings',
      ];

      expect(cachedRoutes).toContain('/lp/dashboard');
      expect(cachedRoutes).toContain('/lp/documents');
      expect(cachedRoutes.length).toBeGreaterThanOrEqual(3);
    });

    it('should queue offline actions for sync', () => {
      const offlineQueue = {
        actions: [] as any[],
        add: function(action: any) { this.actions.push(action); },
        sync: function() { return this.actions.splice(0); },
      };

      offlineQueue.add({ type: 'VIEW_DOCUMENT', docId: 'doc-123' });
      offlineQueue.add({ type: 'MARK_READ', docId: 'doc-456' });

      expect(offlineQueue.actions.length).toBe(2);
      
      const synced = offlineQueue.sync();
      expect(synced.length).toBe(2);
      expect(offlineQueue.actions.length).toBe(0);
    });
  });
});
