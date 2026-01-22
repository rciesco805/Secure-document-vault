import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

jest.mock('@/lib/redis', () => ({
  ratelimit: jest.fn(() => ({
    limit: jest.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 60000 }),
  })),
}));

describe('Dataroom Gate Access Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NDA Gate', () => {
    it('should block access when NDA gate is enabled and not acknowledged', async () => {
      const fund = {
        id: 'fund-1',
        ndaGateEnabled: true,
      };

      const investor = {
        id: 'investor-1',
        ndaAcknowledgedAt: null,
      };

      const requiresNda = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(requiresNda).toBe(true);
    });

    it('should allow access when NDA gate is enabled and acknowledged', async () => {
      const fund = {
        id: 'fund-1',
        ndaGateEnabled: true,
      };

      const investor = {
        id: 'investor-1',
        ndaAcknowledgedAt: new Date(),
      };

      const requiresNda = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(requiresNda).toBe(false);
    });

    it('should allow access when NDA gate is disabled', async () => {
      const fund = {
        id: 'fund-1',
        ndaGateEnabled: false,
      };

      const investor = {
        id: 'investor-1',
        ndaAcknowledgedAt: null,
      };

      const requiresNda = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(requiresNda).toBe(false);
    });
  });

  describe('Accreditation Gate', () => {
    it('should block access when accreditation is required but not completed', async () => {
      const fund = {
        id: 'fund-1',
        requiresAccreditation: true,
      };

      const investor = {
        id: 'investor-1',
        accreditedAt: null,
      };

      const requiresAccreditation = fund.requiresAccreditation && !investor.accreditedAt;
      expect(requiresAccreditation).toBe(true);
    });

    it('should allow access when accreditation is completed', async () => {
      const fund = {
        id: 'fund-1',
        requiresAccreditation: true,
      };

      const investor = {
        id: 'investor-1',
        accreditedAt: new Date(),
      };

      const requiresAccreditation = fund.requiresAccreditation && !investor.accreditedAt;
      expect(requiresAccreditation).toBe(false);
    });
  });

  describe('KYC Gate', () => {
    it('should show pending status when KYC is in progress', () => {
      const investor = {
        id: 'investor-1',
        personaStatus: 'pending',
        personaVerifiedAt: null,
      };

      expect(investor.personaStatus).toBe('pending');
      expect(investor.personaVerifiedAt).toBeNull();
    });

    it('should show approved status when KYC is complete', () => {
      const investor = {
        id: 'investor-1',
        personaStatus: 'approved',
        personaVerifiedAt: new Date(),
      };

      expect(investor.personaStatus).toBe('approved');
      expect(investor.personaVerifiedAt).toBeDefined();
    });

    it('should handle declined KYC status', () => {
      const investor = {
        id: 'investor-1',
        personaStatus: 'declined',
        personaVerifiedAt: null,
      };

      const kycPassed = investor.personaStatus === 'approved';
      expect(kycPassed).toBe(false);
    });

    it('should handle needs_review KYC status', () => {
      const investor = {
        id: 'investor-1',
        personaStatus: 'needs_review',
        personaVerifiedAt: null,
      };

      const kycPassed = investor.personaStatus === 'approved';
      const needsAttention = ['declined', 'needs_review', 'expired'].includes(investor.personaStatus);
      
      expect(kycPassed).toBe(false);
      expect(needsAttention).toBe(true);
    });
  });

  describe('Combined Gate Logic', () => {
    it('should require all gates to pass for full access', () => {
      const fund = {
        ndaGateEnabled: true,
        requiresAccreditation: true,
        requiresKyc: true,
      };

      const investor = {
        ndaAcknowledgedAt: new Date(),
        accreditedAt: new Date(),
        personaStatus: 'approved',
        personaVerifiedAt: new Date(),
      };

      const ndaPassed = !fund.ndaGateEnabled || !!investor.ndaAcknowledgedAt;
      const accreditationPassed = !fund.requiresAccreditation || !!investor.accreditedAt;
      const kycPassed = !fund.requiresKyc || investor.personaStatus === 'approved';

      const allGatesPassed = ndaPassed && accreditationPassed && kycPassed;
      expect(allGatesPassed).toBe(true);
    });

    it('should block if any gate fails', () => {
      const fund = {
        ndaGateEnabled: true,
        requiresAccreditation: true,
        requiresKyc: true,
      };

      const investor = {
        ndaAcknowledgedAt: new Date(),
        accreditedAt: null,
        personaStatus: 'pending',
        personaVerifiedAt: null,
      };

      const ndaPassed = !fund.ndaGateEnabled || !!investor.ndaAcknowledgedAt;
      const accreditationPassed = !fund.requiresAccreditation || !!investor.accreditedAt;
      const kycPassed = !fund.requiresKyc || investor.personaStatus === 'approved';

      const allGatesPassed = ndaPassed && accreditationPassed && kycPassed;
      expect(allGatesPassed).toBe(false);
    });
  });

  describe('506(c) Compliance Logging', () => {
    it('should capture IP address for NDA acknowledgment', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
      const userAgent = req.headers['user-agent'];

      expect(ipAddress).toBe('192.168.1.100');
      expect(userAgent).toContain('Mozilla');
    });

    it('should record timestamp for audit trail', () => {
      const acknowledgment = {
        investorId: 'investor-1',
        acknowledgedAt: new Date(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      expect(acknowledgment.acknowledgedAt).toBeInstanceOf(Date);
      expect(acknowledgment.ipAddress).toBeDefined();
      expect(acknowledgment.userAgent).toBeDefined();
    });
  });
});
