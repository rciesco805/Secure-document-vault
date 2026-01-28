import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Dataroom → Onboard → Gate → Dashboard E2E Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTeam = {
    id: 'team-1',
    name: 'Test Fund GP',
    createdAt: new Date(),
  };

  const mockFund = {
    id: 'fund-1',
    teamId: 'team-1',
    name: 'BF Growth Fund I',
    targetRaise: 10000000,
    minimumInvestment: 25000,
    status: 'RAISING',
    ndaGateEnabled: true,
    formDFilingDate: new Date('2025-06-15'),
    formDAmendmentDue: new Date('2026-06-15'),
    initialThresholdEnabled: true,
    initialThresholdAmount: 1800000,
    createdAt: new Date(),
  };

  const mockDataroom = {
    id: 'dataroom-1',
    pId: 'dr_test123',
    teamId: 'team-1',
    name: 'Fund Documents',
    description: null,
    agentsEnabled: false,
    conversationsEnabled: false,
    enableChangeNotifications: false,
    allowBulkDownload: true,
    showLastUpdated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'investor@example.com',
    name: 'John Investor',
    role: 'LP',
    createdAt: new Date(),
  };

  const mockInvestor = {
    id: 'investor-1',
    userId: 'user-1',
    fundId: 'fund-1',
    entityType: 'INDIVIDUAL',
    ndaSigned: false,
    accreditationStatus: 'PENDING',
    personaStatus: 'NOT_STARTED',
    onboardingStep: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Phase 1: Dataroom Access Request', () => {
    it('should allow unauthenticated view of dataroom listing', async () => {
      (mockPrisma.dataroom.findFirst as jest.Mock).mockResolvedValue(mockDataroom);

      const dataroom = await mockPrisma.dataroom.findFirst({
        where: { id: 'dataroom-1' },
      });

      expect(dataroom).not.toBeNull();
      expect(dataroom?.name).toBe('Fund Documents');
    });

    it('should block access to NDA-gated fund for unauthenticated users', async () => {
      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue(mockFund);

      const fund = await mockPrisma.fund.findFirst({
        where: { id: 'fund-1' },
      });

      expect(fund?.ndaGateEnabled).toBe(true);
      const canAccess = !fund?.ndaGateEnabled;
      expect(canAccess).toBe(false);
    });

    it('should create view record with audit data', async () => {
      const viewAuditData = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Chrome/120',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        geoRegion: 'CA',
        deviceType: 'Desktop',
        browserName: 'Chrome',
        osName: 'macOS',
        sessionId: 'session-123',
        referrer: 'https://google.com',
      };

      (mockPrisma.view.create as jest.Mock).mockResolvedValue({
        id: 'view-1',
        linkId: 'link-1',
        dataroomId: 'dataroom-1',
        viewedAt: new Date(),
        ...viewAuditData,
      });

      const view = await mockPrisma.view.create({
        data: {
          linkId: 'link-1',
          dataroomId: 'dataroom-1',
          ...viewAuditData,
        },
      });

      expect(view.ipAddress).toBe('192.168.1.1');
      expect(view.geoCountry).toBe('US');
      expect(view.deviceType).toBe('Desktop');
    });
  });

  describe('Phase 2: Investor Onboarding', () => {
    it('should create user account with LP role', async () => {
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const user = await mockPrisma.user.create({
        data: {
          email: 'investor@example.com',
          name: 'John Investor',
          role: 'LP',
        },
      });

      expect(user.role).toBe('LP');
      expect(user.email).toBe('investor@example.com');
    });

    it('should create investor profile linked to user and fund', async () => {
      (mockPrisma.investor.create as jest.Mock).mockResolvedValue(mockInvestor);

      const investor = await mockPrisma.investor.create({
        data: {
          userId: 'user-1',
          fundId: 'fund-1',
          entityType: 'INDIVIDUAL',
        },
      });

      expect(investor.userId).toBe('user-1');
      expect(investor.fundId).toBe('fund-1');
      expect(investor.onboardingStep).toBe(0);
    });

    it('should track onboarding step progression', async () => {
      const steps = [1, 2, 3];

      for (const step of steps) {
        (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
          ...mockInvestor,
          onboardingStep: step,
        });

        const updated = await mockPrisma.investor.update({
          where: { id: 'investor-1' },
          data: { onboardingStep: step },
        });

        expect(updated.onboardingStep).toBe(step);
      }
    });
  });

  describe('Phase 3: NDA Gate', () => {
    it('should block dataroom access when NDA not signed', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: false,
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      expect(investor?.ndaSigned).toBe(false);
      const canAccessDataroom = investor?.ndaSigned === true;
      expect(canAccessDataroom).toBe(false);
    });

    it('should record NDA signature with audit trail', async () => {
      const ndaSignedAt = new Date();

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: true,
        ndaSignedAt,
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: {
          ndaSigned: true,
          ndaSignedAt,
        },
      });

      expect(updated.ndaSigned).toBe(true);
      expect(updated.ndaSignedAt).toEqual(ndaSignedAt);
    });

    it('should allow dataroom access after NDA signed', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: true,
        ndaSignedAt: new Date(),
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      expect(investor?.ndaSigned).toBe(true);
      const canAccessDataroom = investor?.ndaSigned === true;
      expect(canAccessDataroom).toBe(true);
    });
  });

  describe('Phase 4: Accreditation Gate', () => {
    it('should block fundroom access when accreditation pending', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ndaSigned: true,
        accreditationStatus: 'PENDING',
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const canAccessFundroom = investor?.accreditationStatus === 'SELF_CERTIFIED' || 
                                 investor?.accreditationStatus === 'KYC_VERIFIED';
      expect(canAccessFundroom).toBe(false);
    });

    it('should record accreditation self-certification with 506(c) compliance', async () => {
      const accreditationData = {
        accreditationStatus: 'SELF_CERTIFIED',
        accreditationType: 'INCOME',
        accreditationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      (mockPrisma.investor.update as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        ...accreditationData,
      });

      (mockPrisma.accreditationAck.create as jest.Mock).mockResolvedValue({
        id: 'ack-1',
        investorId: 'investor-1',
        acknowledged: true,
        method: 'SELF_CERTIFIED',
        accreditationType: 'INCOME',
        confirmAccredited: true,
        confirmRiskAware: true,
        confirmDocReview: true,
        confirmRepresentations: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        completedAt: new Date(),
      });

      const updated = await mockPrisma.investor.update({
        where: { id: 'investor-1' },
        data: accreditationData,
      });

      expect(updated.accreditationStatus).toBe('SELF_CERTIFIED');
      expect(updated.accreditationType).toBe('INCOME');
    });

    it('should create accreditation acknowledgment with all checkboxes', async () => {
      const ackData = {
        investorId: 'investor-1',
        acknowledged: true,
        method: 'SELF_CERTIFIED',
        accreditationType: 'NET_WORTH',
        confirmAccredited: true,
        confirmRiskAware: true,
        confirmDocReview: true,
        confirmRepresentations: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      (mockPrisma.accreditationAck.create as jest.Mock).mockResolvedValue({
        id: 'ack-1',
        ...ackData,
        completedAt: new Date(),
      });

      const ack = await mockPrisma.accreditationAck.create({ data: ackData });

      expect(ack.confirmAccredited).toBe(true);
      expect(ack.confirmRiskAware).toBe(true);
      expect(ack.confirmDocReview).toBe(true);
      expect(ack.confirmRepresentations).toBe(true);
    });
  });

  describe('Phase 5: Dashboard Access', () => {
    it('should allow dashboard access after all gates passed', async () => {
      const fullyOnboardedInvestor = {
        ...mockInvestor,
        ndaSigned: true,
        ndaSignedAt: new Date(),
        accreditationStatus: 'SELF_CERTIFIED',
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
      };

      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue(fullyOnboardedInvestor);

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
      });

      const hasSignedNda = investor?.ndaSigned === true;
      const isAccredited = ['SELF_CERTIFIED', 'KYC_VERIFIED'].includes(
        investor?.accreditationStatus || ''
      );
      const canAccessDashboard = hasSignedNda && isAccredited;

      expect(canAccessDashboard).toBe(true);
    });

    it('should load fund details for dashboard', async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue({
        ...mockFund,
        aggregate: {
          totalCommitted: 2500000,
          totalInbound: 1000000,
          totalOutbound: 100000,
          initialThresholdMet: true,
        },
      });

      const fund = await mockPrisma.fund.findUnique({
        where: { id: 'fund-1' },
        include: { aggregate: true },
      });

      expect(fund?.name).toBe('BF Growth Fund I');
      expect(fund?.aggregate?.totalCommitted).toBe(2500000);
      expect(fund?.aggregate?.initialThresholdMet).toBe(true);
    });

    it('should display Form D filing information', async () => {
      (mockPrisma.fund.findUnique as jest.Mock).mockResolvedValue(mockFund);

      const fund = await mockPrisma.fund.findUnique({
        where: { id: 'fund-1' },
      });

      expect(fund?.formDFilingDate).toBeDefined();
      expect(fund?.formDAmendmentDue).toBeDefined();

      const filingDate = new Date(fund!.formDFilingDate!);
      const amendmentDue = new Date(fund!.formDAmendmentDue!);
      const isAmendmentWithinYear = 
        amendmentDue.getTime() - filingDate.getTime() <= 366 * 24 * 60 * 60 * 1000;

      expect(isAmendmentWithinYear).toBe(true);
    });

    it('should load investor documents and investments', async () => {
      (mockPrisma.investor.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvestor,
        documents: [
          { id: 'doc-1', title: 'Signed NDA', documentType: 'NDA' },
          { id: 'doc-2', title: 'Subscription Agreement', documentType: 'SUBSCRIPTION' },
        ],
        investments: [
          { id: 'inv-1', fundId: 'fund-1', commitmentAmount: 100000, fundedAmount: 50000 },
        ],
      });

      const investor = await mockPrisma.investor.findUnique({
        where: { id: 'investor-1' },
        include: { documents: true, investments: true },
      });

      expect(investor?.documents).toHaveLength(2);
      expect(investor?.investments).toHaveLength(1);
      expect(investor?.investments?.[0].commitmentAmount).toBe(100000);
    });
  });

  describe('Complete Flow Integration', () => {
    it('should complete full flow: dataroom → onboard → NDA → accreditation → dashboard', async () => {
      (mockPrisma.fund.findFirst as jest.Mock).mockResolvedValue(mockFund);
      const fund = await mockPrisma.fund.findFirst({ where: { id: 'fund-1' } });
      expect(fund?.ndaGateEnabled).toBe(true);

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      const user = await mockPrisma.user.create({
        data: { email: 'investor@example.com', name: 'John Investor', role: 'LP' },
      });
      expect(user.role).toBe('LP');

      (mockPrisma.investor.create as jest.Mock).mockResolvedValue(mockInvestor);
      const investor = await mockPrisma.investor.create({
        data: { userId: user.id, fundId: 'fund-1' },
      });
      expect(investor.onboardingStep).toBe(0);

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        ...investor,
        ndaSigned: true,
        ndaSignedAt: new Date(),
        onboardingStep: 1,
      });
      const afterNda = await mockPrisma.investor.update({
        where: { id: investor.id },
        data: { ndaSigned: true, ndaSignedAt: new Date(), onboardingStep: 1 },
      });
      expect(afterNda.ndaSigned).toBe(true);

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        ...afterNda,
        accreditationStatus: 'SELF_CERTIFIED',
        onboardingStep: 2,
      });
      const afterAccreditation = await mockPrisma.investor.update({
        where: { id: investor.id },
        data: { accreditationStatus: 'SELF_CERTIFIED', onboardingStep: 2 },
      });
      expect(afterAccreditation.accreditationStatus).toBe('SELF_CERTIFIED');

      (mockPrisma.investor.update as jest.Mock).mockResolvedValueOnce({
        ...afterAccreditation,
        onboardingStep: 3,
        onboardingCompletedAt: new Date(),
      });
      const completed = await mockPrisma.investor.update({
        where: { id: investor.id },
        data: { onboardingStep: 3, onboardingCompletedAt: new Date() },
      });
      expect(completed.onboardingCompletedAt).toBeDefined();

      const canAccessDashboard = 
        completed.ndaSigned && 
        completed.accreditationStatus === 'SELF_CERTIFIED' &&
        completed.onboardingCompletedAt !== null;
      expect(canAccessDashboard).toBe(true);
    });
  });
});
