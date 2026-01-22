require('@testing-library/jest-dom');

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
    },
    signatureField: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    signatureAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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

process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:5000';
