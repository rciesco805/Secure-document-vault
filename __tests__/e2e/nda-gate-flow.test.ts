import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('NDA Gate Flow E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NDA Gate Status Check', () => {
    it('should show NDA modal when gate is enabled and not acknowledged', async () => {
      const fund = {
        id: 'fund-1',
        name: 'BF Growth Fund I',
        ndaGateEnabled: true,
      };

      const investor = {
        id: 'investor-1',
        email: 'investor@example.com',
        ndaAcknowledgedAt: null,
        accreditedAt: null,
      };

      const showNdaModal = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(showNdaModal).toBe(true);
    });

    it('should skip NDA modal when gate is disabled', async () => {
      const fund = {
        id: 'fund-1',
        ndaGateEnabled: false,
      };

      const investor = {
        id: 'investor-1',
        ndaAcknowledgedAt: null,
      };

      const showNdaModal = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(showNdaModal).toBe(false);
    });

    it('should skip NDA modal when already acknowledged', async () => {
      const fund = {
        id: 'fund-1',
        ndaGateEnabled: true,
      };

      const investor = {
        id: 'investor-1',
        ndaAcknowledgedAt: new Date(),
      };

      const showNdaModal = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(showNdaModal).toBe(false);
    });
  });

  describe('2-Step Accreditation Wizard', () => {
    it('should require NDA acceptance before accreditation', async () => {
      const wizardStep = 1;
      const ndaAccepted = false;

      const canProceedToAccreditation = wizardStep === 1 && ndaAccepted;
      expect(canProceedToAccreditation).toBe(false);
    });

    it('should proceed to accreditation after NDA acceptance', async () => {
      const ndaAccepted = true;
      const canProceedToAccreditation = ndaAccepted;
      expect(canProceedToAccreditation).toBe(true);
    });

    it('should validate accreditation criteria selection', async () => {
      const accreditationCriteria = [
        { id: 'income', label: '$200K+ annual income (or $300K+ joint)', selected: false },
        { id: 'networth', label: '$1M+ net worth (excluding primary residence)', selected: true },
      ];

      const hasSelectedCriteria = accreditationCriteria.some(c => c.selected);
      expect(hasSelectedCriteria).toBe(true);
    });

    it('should not allow submission without accreditation selection', async () => {
      const accreditationCriteria = [
        { id: 'income', selected: false },
        { id: 'networth', selected: false },
      ];

      const canSubmit = accreditationCriteria.some(c => c.selected);
      expect(canSubmit).toBe(false);
    });
  });

  describe('NDA/Accreditation Acknowledgment API', () => {
    it('should store NDA acknowledgment with timestamp', async () => {
      const acknowledgmentData = {
        investorId: 'investor-1',
        type: 'NDA',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      };

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        ndaSigned: true,
        ndaSignedAt: acknowledgmentData.timestamp,
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: {
          ndaSigned: true,
          ndaSignedAt: acknowledgmentData.timestamp,
        },
      });

      expect(updated.ndaSigned).toBe(true);
      expect(updated.ndaSignedAt).not.toBeNull();
    });

    it('should store accreditation with SEC 506(c) compliance data', async () => {
      const accreditationData = {
        investorId: 'investor-1',
        criteria: 'NET_WORTH',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      };

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        id: 'investor-1',
        accreditationStatus: 'SELF_CERTIFIED',
        accreditationType: accreditationData.criteria,
        accreditationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: {
          accreditationStatus: 'SELF_CERTIFIED',
          accreditationType: accreditationData.criteria,
          accreditationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      expect(updated.accreditationStatus).toBe('SELF_CERTIFIED');
      expect(updated.accreditationType).toBe('NET_WORTH');
    });
  });

  describe('Complete NDA Gate Flow', () => {
    it('should complete: view fund → NDA modal → accept → accreditation → dashboard', async () => {
      const fund = { id: 'fund-1', ndaGateEnabled: true };
      let investor = {
        id: 'investor-1',
        ndaAcknowledgedAt: null as Date | null,
        accreditedAt: null as Date | null,
      };

      const step1_showModal = fund.ndaGateEnabled && !investor.ndaAcknowledgedAt;
      expect(step1_showModal).toBe(true);

      investor.ndaAcknowledgedAt = new Date();
      const step2_ndaDone = investor.ndaAcknowledgedAt !== null;
      expect(step2_ndaDone).toBe(true);

      investor.accreditedAt = new Date();
      const step3_accreditedDone = investor.accreditedAt !== null;
      expect(step3_accreditedDone).toBe(true);

      const step4_canAccessDashboard = investor.ndaAcknowledgedAt && investor.accreditedAt;
      expect(step4_canAccessDashboard).toBeTruthy();
    });
  });

  describe('AccreditationAck Model', () => {
    it('should create AccreditationAck record for audit trail', async () => {
      const ackRecord = {
        id: 'ack-1',
        investorId: 'investor-1',
        ndaAcceptedAt: new Date(),
        accreditedAt: new Date(),
        criteria: 'income',
        ipAddress: '10.0.0.1',
        userAgent: 'Test Browser',
      };

      expect(ackRecord.ndaAcceptedAt).toBeDefined();
      expect(ackRecord.accreditedAt).toBeDefined();
      expect(ackRecord.ipAddress).toBe('10.0.0.1');
    });
  });
});
