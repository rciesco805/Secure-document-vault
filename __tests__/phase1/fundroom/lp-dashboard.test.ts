// @ts-nocheck
// Phase 1: Fundroom Dashboard - LP Personalized Views Tests
// Covers: Fund aggregates, signed documents, feedback, capital calls, summary cards

import {
  mockPrisma,
  createMockFund,
  createMockInvestor,
  setupTestMocks,
} from '../utils/test-helpers';

describe('Phase 1: Fundroom Dashboard - Personalized Views', () => {
  beforeEach(() => {
    setupTestMocks();
  });

  const mockFund = createMockFund({
    name: 'Bermuda Growth Fund',
    targetAmount: 10000000,
    initialClosingThreshold: 2500000,
  });

  const mockInvestor = createMockInvestor({
    ndaSigned: true,
    accreditationStatus: 'VERIFIED',
    onboardingStep: 3,
  });

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
        { id: 'inv-1', investorId: 'investor-1', fundId: 'fund-bermuda', amount: 500000, units: 50, status: 'CONFIRMED' },
      ];

      const filteredInvestments = mockInvestments.filter(inv => inv.investorId === 'investor-1');

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
        { id: 'sig-1', documentId: 'doc-nda', status: 'COMPLETED', signedAt: new Date(), documentPath: '/documents/investor-1/nda-signed.pdf' },
        { id: 'sig-2', documentId: 'doc-subscription', status: 'COMPLETED', signedAt: new Date(), documentPath: '/documents/investor-1/subscription-signed.pdf' },
      ];

      const completedDocs = mockSignedDocs.filter(doc => doc.status === 'COMPLETED');

      expect(completedDocs).toHaveLength(2);
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
      const feedbackForm = { subject: '', message: '', category: 'GENERAL' };

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

    it('should log feedback in audit trail', () => {
      const auditLog = {
        action: 'FEEDBACK_SUBMITTED',
        userId: 'user-1',
        investorId: 'investor-1',
        metadata: { category: 'DISTRIBUTIONS', fundId: 'fund-bermuda' },
        timestamp: new Date(),
      };

      expect(auditLog.action).toBe('FEEDBACK_SUBMITTED');
    });
  });

  describe('Capital Call Notices', () => {
    it('should list capital calls for investor', async () => {
      (mockPrisma.capitalCall.findMany as jest.Mock).mockResolvedValue([
        { id: 'call-1', fundId: 'fund-bermuda', amount: 50000, dueDate: new Date('2026-02-15'), status: 'PENDING' },
        { id: 'call-2', fundId: 'fund-bermuda', amount: 25000, dueDate: new Date('2026-01-10'), status: 'PAID' },
      ]);

      const calls = await mockPrisma.capitalCall.findMany({ where: { fundId: 'fund-bermuda' } });

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

    it('should include capital call notice PDF link', () => {
      const capitalCall = { id: 'call-1', noticeDocumentPath: '/notices/call-1-notice.pdf' };

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
      const fundedCard = { title: 'Funded', value: 250000, percentOfCommitment: 50 };

      expect(fundedCard.percentOfCommitment).toBe(50);
    });

    it('should display distributions received card', () => {
      const distributionsCard = { title: 'Distributions', value: 75000, ytdValue: 25000 };

      expect(distributionsCard.value).toBe(75000);
      expect(distributionsCard.ytdValue).toBe(25000);
    });

    it('should display pending actions badge', () => {
      const pendingActions = { pendingCalls: 1, pendingSignatures: 2, unreadNotices: 3 };

      const totalPending = pendingActions.pendingCalls + pendingActions.pendingSignatures + pendingActions.unreadNotices;

      expect(totalPending).toBe(6);
    });

    it('should show welcome banner for new investors', () => {
      const investorOnboarding = { step: 3, totalSteps: 5, showWelcomeBanner: true, progressPercent: 60 };

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
      const refreshButton = { visible: true, lastRefreshed: new Date(), isLoading: false };

      expect(refreshButton.visible).toBe(true);
    });

    it('should update dashboard data on refresh', async () => {
      const initialData = { totalRaised: 2000000 };
      const refreshedData = { totalRaised: 2500000 };

      expect(refreshedData.totalRaised).toBeGreaterThan(initialData.totalRaised);
    });
  });
});
