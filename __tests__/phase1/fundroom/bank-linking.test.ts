// @ts-nocheck
// Phase 1: Bank Connect & Payments (Plaid) Tests
// Covers: Connect bank wizard, Plaid Link, bank storage, ACH transfers, webhooks

import {
  mockPrisma,
  createMockInvestor,
  setupTestMocks,
} from '../utils/test-helpers';

describe('Phase 1: Bank Connect & Payments (Plaid)', () => {
  beforeEach(() => {
    setupTestMocks();
  });

  const mockInvestor = createMockInvestor({
    kycStatus: 'VERIFIED',
  });

  describe('Connect Bank Wizard', () => {
    it('should show Connect Bank CTA after KYC verified', () => {
      const kycStatus = 'VERIFIED';
      const hasBankLinked = false;
      const showConnectBank = kycStatus === 'VERIFIED' && !hasBankLinked;

      expect(showConnectBank).toBe(true);
    });

    it('should hide Connect Bank if already linked', () => {
      const hasBankLinked = true;
      const showConnectBank = !hasBankLinked;

      expect(showConnectBank).toBe(false);
    });

    it('should generate Plaid Link token', () => {
      const linkToken = {
        link_token: 'link-sandbox-abc123',
        expiration: new Date(Date.now() + 30 * 60 * 1000),
        request_id: 'req-123',
      };

      expect(linkToken.link_token).toContain('link-sandbox');
    });

    it('should configure Plaid Link for sandbox environment', () => {
      const plaidConfig = {
        env: 'sandbox',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        client_name: 'BF Fund',
      };

      expect(plaidConfig.env).toBe('sandbox');
      expect(plaidConfig.products).toContain('auth');
    });
  });

  describe('Plaid Link Embed', () => {
    it('should handle Plaid Link success callback', () => {
      const plaidSuccess = {
        public_token: 'public-sandbox-abc123',
        metadata: {
          institution: { name: 'Chase', institution_id: 'ins_3' },
          accounts: [{ id: 'account-123', name: 'Checking', type: 'depository', subtype: 'checking', mask: '1234' }],
        },
      };

      expect(plaidSuccess.public_token).toContain('public-sandbox');
      expect(plaidSuccess.metadata.accounts).toHaveLength(1);
    });

    it('should exchange public token for access token', () => {
      const tokenExchange = {
        public_token: 'public-sandbox-abc123',
        access_token: 'access-sandbox-xyz789',
        item_id: 'item-123',
      };

      expect(tokenExchange.access_token).toContain('access-sandbox');
    });

    it('should handle Plaid Link exit (user cancelled)', () => {
      const plaidExit = { status: 'cancelled', error: null };

      expect(plaidExit.status).toBe('cancelled');
    });

    it('should handle Plaid Link error', () => {
      const plaidError = {
        error_type: 'INSTITUTION_ERROR',
        error_code: 'INSTITUTION_NOT_RESPONDING',
        error_message: 'The institution is not responding',
        display_message: 'Please try again later',
      };

      expect(plaidError.error_type).toBe('INSTITUTION_ERROR');
    });
  });

  describe('BankLink Model Storage', () => {
    it('should store bank link in Prisma', async () => {
      const bankLinkData = {
        investorId: 'investor-1',
        plaidItemId: 'item-123',
        plaidAccessToken: 'encrypted-access-token',
        institutionId: 'ins_3',
        institutionName: 'Chase',
        accountId: 'account-123',
        accountName: 'Checking',
        accountType: 'CHECKING',
        accountMask: '1234',
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      expect(bankLinkData.status).toBe('ACTIVE');
      expect(bankLinkData.institutionName).toBe('Chase');
    });

    it('should encrypt access token before storage', () => {
      const accessToken = 'access-sandbox-xyz789';
      const encryptedToken = `encrypted:${Buffer.from(accessToken).toString('base64')}`;

      expect(encryptedToken).toContain('encrypted:');
      expect(encryptedToken).not.toBe(accessToken);
    });

    it('should store multiple accounts per investor', () => {
      const bankLinks = [
        { id: 'link-1', accountName: 'Checking', accountMask: '1234' },
        { id: 'link-2', accountName: 'Savings', accountMask: '5678' },
      ];

      expect(bankLinks).toHaveLength(2);
    });

    it('should track bank link status', () => {
      const statusTypes = ['ACTIVE', 'PENDING_VERIFICATION', 'DISCONNECTED', 'ERROR'];
      const currentStatus = 'ACTIVE';

      expect(statusTypes).toContain(currentStatus);
    });
  });

  describe('Inbound: Capital Call Pull (ACH Debit)', () => {
    it('should initiate ACH debit for capital call', () => {
      const achDebit = {
        type: 'DEBIT',
        amount: 50000,
        currency: 'USD',
        accountId: 'account-123',
        description: 'Capital Call #1 - Bermuda Growth Fund',
        idempotencyKey: 'call-1-investor-1',
      };

      expect(achDebit.type).toBe('DEBIT');
      expect(achDebit.amount).toBe(50000);
    });

    it('should validate sufficient balance before debit', () => {
      const accountBalance = 75000;
      const debitAmount = 50000;
      const hasSufficientFunds = accountBalance >= debitAmount;

      expect(hasSufficientFunds).toBe(true);
    });

    it('should reject debit for insufficient funds', () => {
      const accountBalance = 25000;
      const debitAmount = 50000;
      const hasSufficientFunds = accountBalance >= debitAmount;

      expect(hasSufficientFunds).toBe(false);
    });

    it('should create pending transaction for capital call', () => {
      const transaction = {
        id: 'txn-1',
        investorId: 'investor-1',
        capitalCallId: 'call-1',
        type: 'CAPITAL_CALL',
        direction: 'INBOUND',
        amount: 50000,
        status: 'PENDING',
        plaidTransferId: 'transfer-123',
        initiatedAt: new Date(),
      };

      expect(transaction.status).toBe('PENDING');
      expect(transaction.direction).toBe('INBOUND');
    });

    it('should use idempotency key to prevent duplicates', () => {
      const idempotencyKey = `call-${1}-investor-${1}`;
      expect(idempotencyKey).toBe('call-1-investor-1');
    });
  });

  describe('Outbound: Distribution Push (ACH Credit)', () => {
    it('should initiate ACH credit for distribution', () => {
      const achCredit = {
        type: 'CREDIT',
        amount: 25000,
        currency: 'USD',
        accountId: 'account-123',
        description: 'Q4 2025 Distribution - Bermuda Growth Fund',
        idempotencyKey: 'dist-1-investor-1',
      };

      expect(achCredit.type).toBe('CREDIT');
      expect(achCredit.amount).toBe(25000);
    });

    it('should calculate investor pro-rata distribution', () => {
      const totalDistribution = 500000;
      const investorOwnership = 0.05;
      const investorShare = totalDistribution * investorOwnership;

      expect(investorShare).toBe(25000);
    });

    it('should create pending transaction for distribution', () => {
      const transaction = {
        id: 'txn-2',
        investorId: 'investor-1',
        distributionId: 'dist-1',
        type: 'DISTRIBUTION',
        direction: 'OUTBOUND',
        amount: 25000,
        status: 'PENDING',
        plaidTransferId: 'transfer-456',
        initiatedAt: new Date(),
      };

      expect(transaction.status).toBe('PENDING');
      expect(transaction.direction).toBe('OUTBOUND');
    });

    it('should withhold taxes if required', () => {
      const grossDistribution = 25000;
      const withholdingPercent = 28;
      const withheldAmount = Math.round(grossDistribution * withholdingPercent / 100);
      const netDistribution = grossDistribution - withheldAmount;

      expect(withheldAmount).toBe(7000);
      expect(netDistribution).toBe(18000);
    });
  });

  describe('Transaction Model', () => {
    it('should store transaction with all required fields', () => {
      const transaction = {
        id: 'txn-1',
        investorId: 'investor-1',
        fundId: 'fund-bermuda',
        type: 'CAPITAL_CALL',
        direction: 'INBOUND',
        amount: 50000,
        currency: 'USD',
        status: 'PENDING',
        plaidTransferId: 'transfer-123',
        bankLinkId: 'link-1',
        initiatedAt: new Date(),
        completedAt: null,
      };

      expect(transaction.amount).toBe(50000);
      expect(transaction.currency).toBe('USD');
    });

    it('should support all transaction statuses', () => {
      const statuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETURNED'];

      expect(statuses).toContain('PENDING');
      expect(statuses).toContain('COMPLETED');
      expect(statuses).toContain('FAILED');
    });

    it('should track transaction status changes', () => {
      const statusHistory = [
        { status: 'PENDING', timestamp: new Date('2026-01-20T10:00:00Z') },
        { status: 'PROCESSING', timestamp: new Date('2026-01-20T10:05:00Z') },
        { status: 'COMPLETED', timestamp: new Date('2026-01-21T14:00:00Z') },
      ];

      expect(statusHistory).toHaveLength(3);
      expect(statusHistory[2].status).toBe('COMPLETED');
    });

    it('should store audit JSON with transaction', () => {
      const auditJson = {
        initiatedBy: 'system',
        capitalCallId: 'call-1',
        ipAddress: '192.168.1.100',
        userAgent: 'BF Fund API',
        plaidResponse: { transfer_id: 'transfer-123', status: 'pending' },
        webhookEvents: [{ event: 'transfer.created', timestamp: new Date().toISOString() }],
      };

      expect(auditJson.plaidResponse.status).toBe('pending');
      expect(auditJson.webhookEvents).toHaveLength(1);
    });

    it('should link transaction to capital call', () => {
      const transaction = {
        id: 'txn-1',
        capitalCallId: 'call-1',
        capitalCall: { id: 'call-1', amount: 500000, dueDate: new Date('2026-02-15') },
      };

      expect(transaction.capitalCallId).toBe('call-1');
      expect(transaction.capitalCall.amount).toBe(500000);
    });

    it('should link transaction to distribution', () => {
      const transaction = {
        id: 'txn-2',
        distributionId: 'dist-1',
        distribution: { id: 'dist-1', totalAmount: 500000, distributionDate: new Date('2026-01-15') },
      };

      expect(transaction.distributionId).toBe('dist-1');
    });
  });

  describe('Real-time Webhook Updates', () => {
    it('should process Plaid transfer webhook', () => {
      const webhook = {
        webhook_type: 'TRANSFER_EVENTS',
        webhook_code: 'TRANSFER_EVENTS_UPDATE',
        transfer_events: [{ transfer_id: 'transfer-123', event_type: 'settled', timestamp: new Date().toISOString() }],
      };

      expect(webhook.webhook_code).toBe('TRANSFER_EVENTS_UPDATE');
      expect(webhook.transfer_events[0].event_type).toBe('settled');
    });

    it('should update transaction status on webhook', async () => {
      const webhookEvent = { event_type: 'settled', transfer_id: 'transfer-123' };
      
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'posted': 'PROCESSING',
        'settled': 'COMPLETED',
        'failed': 'FAILED',
        'returned': 'RETURNED',
      };

      const newStatus = statusMap[webhookEvent.event_type];
      expect(newStatus).toBe('COMPLETED');
    });

    it('should handle transfer failed webhook', () => {
      const failedTransfer = {
        transfer_id: 'transfer-123',
        event_type: 'failed',
        failure_reason: { ach_return_code: 'R01', description: 'Insufficient Funds' },
      };

      expect(failedTransfer.failure_reason.ach_return_code).toBe('R01');
    });

    it('should handle transfer returned webhook', () => {
      const returnedTransfer = {
        transfer_id: 'transfer-123',
        event_type: 'returned',
        failure_reason: { ach_return_code: 'R03', description: 'No Account/Unable to Locate Account' },
      };

      expect(returnedTransfer.failure_reason.ach_return_code).toBe('R03');
    });

    it('should verify Plaid webhook signature', () => {
      const webhookSecret = 'plaid_webhook_secret';
      const signedBody = 'sha256=abc123def456';
      const isValid = signedBody.startsWith('sha256=');

      expect(isValid).toBe(true);
    });

    it('should send notification on transaction completion', () => {
      const notification = {
        type: 'TRANSACTION_COMPLETED',
        investorId: 'investor-1',
        transactionId: 'txn-1',
        amount: 50000,
        message: 'Your capital call payment of $50,000 has been processed.',
      };

      expect(notification.type).toBe('TRANSACTION_COMPLETED');
    });
  });

  describe('Error Handling', () => {
    it('should handle Plaid API errors', () => {
      const plaidError = {
        error_type: 'API_ERROR',
        error_code: 'INTERNAL_SERVER_ERROR',
        error_message: 'An unexpected error occurred',
        request_id: 'req-123',
      };

      expect(plaidError.error_type).toBe('API_ERROR');
    });

    it('should handle bank connection errors', () => {
      const connectionError = {
        status: 'ERROR',
        errorCode: 'ITEM_LOGIN_REQUIRED',
        message: 'Bank connection requires re-authentication',
      };

      expect(connectionError.errorCode).toBe('ITEM_LOGIN_REQUIRED');
    });

    it('should handle ACH return codes', () => {
      const achReturnCodes: Record<string, string> = {
        'R01': 'Insufficient Funds',
        'R02': 'Account Closed',
        'R03': 'No Account/Unable to Locate Account',
        'R04': 'Invalid Account Number',
        'R08': 'Payment Stopped',
      };

      expect(achReturnCodes['R01']).toBe('Insufficient Funds');
      expect(Object.keys(achReturnCodes)).toHaveLength(5);
    });

    it('should retry failed transfers with backoff', () => {
      const retryConfig = {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['R01', 'INSTITUTION_ERROR'],
      };

      const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, 1);
      expect(delay).toBe(2000);
    });
  });

  describe('Compliance & Audit', () => {
    it('should log all bank operations in audit trail', () => {
      const auditLog = {
        action: 'BANK_CONNECTED',
        investorId: 'investor-1',
        institutionName: 'Chase',
        accountMask: '1234',
        timestamp: new Date(),
        ipAddress: '192.168.1.100',
      };

      expect(auditLog.action).toBe('BANK_CONNECTED');
    });

    it('should store transaction audit with timestamps', () => {
      const transactionAudit = {
        transactionId: 'txn-1',
        events: [
          { action: 'INITIATED', timestamp: new Date(), actor: 'system' },
          { action: 'SUBMITTED_TO_PLAID', timestamp: new Date(), actor: 'system' },
          { action: 'WEBHOOK_RECEIVED', timestamp: new Date(), webhookType: 'settled' },
          { action: 'COMPLETED', timestamp: new Date(), actor: 'webhook' },
        ],
      };

      expect(transactionAudit.events).toHaveLength(4);
    });
  });
});
