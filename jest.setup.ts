import '@testing-library/jest-dom';

jest.mock('@sindresorhus/slugify', () => ({
  __esModule: true,
  default: (str: string) => str.toLowerCase().replace(/\s+/g, '-'),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    signatureDocument: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    signatureRecipient: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    signatureField: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    signatureAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userTeam: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    investor: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    fund: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    view: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    accreditationAck: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dataroom: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    link: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    viewer: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    capitalCall: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    distribution: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      signatureDocument: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      signatureRecipient: {
        update: jest.fn(),
      },
      signatureField: {
        updateMany: jest.fn(),
      },
      signatureAuditLog: {
        create: jest.fn(),
      },
    })),
  },
}));

jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  ratelimit: jest.fn(() => ({
    limit: jest.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 60000 }),
  })),
}));

jest.mock('@/lib/files/get-file', () => ({
  getFile: jest.fn().mockResolvedValue('https://example.com/test.pdf'),
}));

jest.mock('@/lib/resend', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/webhook/triggers/signature-events', () => ({
  onRecipientSigned: jest.fn().mockResolvedValue(undefined),
  onDocumentCompleted: jest.fn().mockResolvedValue(undefined),
  onDocumentDeclined: jest.fn().mockResolvedValue(undefined),
  onDocumentViewed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/pages/api/teams/[teamId]/signature-documents/[documentId]/send', () => ({
  sendToNextSigners: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/tinybird', () => ({
  recordAnalytics: jest.fn().mockResolvedValue(undefined),
  recordSignatureEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}));

process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:5000';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.PERSONA_API_KEY = 'test-persona-key';
process.env.PERSONA_TEMPLATE_ID = 'test-template-id';
