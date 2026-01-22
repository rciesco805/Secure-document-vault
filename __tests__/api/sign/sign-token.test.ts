import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/sign/[token]';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/sign/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Fetch signing document', () => {
    it('returns 400 if token is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ message: 'Token is required' });
    });

    it('returns 404 if token is invalid', async () => {
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'invalid-token' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({ message: 'Invalid or expired signing link' });
    });

    it('returns 410 if document is expired', async () => {
      const expiredDate = new Date(Date.now() - 86400000);
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        document: {
          id: 'doc-1',
          status: 'PENDING',
          expirationDate: expiredDate,
          fields: [],
          team: { name: 'Test Team' },
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'test-token' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      expect(JSON.parse(res._getData())).toEqual({ message: 'This signing link has expired' });
    });

    it('returns 410 if document is voided', async () => {
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        document: {
          id: 'doc-1',
          status: 'VOIDED',
          expirationDate: null,
          fields: [],
          team: { name: 'Test Team' },
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'test-token' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
      expect(JSON.parse(res._getData())).toEqual({ message: 'This document has been voided' });
    });

    it('returns 400 if document is already completed', async () => {
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        document: {
          id: 'doc-1',
          status: 'COMPLETED',
          expirationDate: null,
          fields: [],
          team: { name: 'Test Team' },
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'test-token' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ message: 'This document has already been completed' });
    });

    it('returns document data for valid pending document', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        email: 'signer@example.com',
        name: 'Test Signer',
        role: 'SIGNER',
        status: 'PENDING',
        order: 1,
        document: {
          id: 'doc-1',
          title: 'Test Document',
          status: 'PENDING',
          expirationDate: futureDate,
          storageType: 'REPLIT',
          documentUrl: 'documents/test.pdf',
          numPages: 3,
          teamId: 'team-1',
          fields: [
            { id: 'field-1', type: 'SIGNATURE', pageNumber: 1, x: 100, y: 200, width: 200, height: 50, recipientId: 'recipient-1' },
          ],
          team: { name: 'Test Team' },
        },
      });

      (mockPrisma.signatureAuditLog.create as jest.Mock).mockResolvedValue({});

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'test-token' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.document).toBeDefined();
      expect(data.document.title).toBe('Test Document');
      expect(data.recipient).toBeDefined();
      expect(data.recipient.name).toBe('Test Signer');
    });
  });

  describe('POST - Submit signature', () => {
    it('returns 404 if recipient not found for POST', async () => {
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { token: 'invalid-token' },
        body: { fields: [] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({ message: 'Invalid signing link' });
    });

    it('returns 400 if recipient already signed', async () => {
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        status: 'SIGNED',
        role: 'SIGNER',
        document: {
          id: 'doc-1',
          status: 'PENDING',
          expirationDate: null,
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { token: 'test-token' },
        body: { fields: [] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({ message: 'You have already signed this document' });
    });

    it('returns 410 for POST on voided document', async () => {
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        status: 'PENDING',
        role: 'SIGNER',
        document: {
          id: 'doc-1',
          status: 'VOIDED',
          expirationDate: null,
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        query: { token: 'test-token' },
        body: { fields: [{ id: 'field-1', value: 'signature-data' }] },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(410);
    });
  });

  describe('Document Access', () => {
    it('returns document fields for signing', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        email: 'signer@example.com',
        name: 'Test Signer',
        role: 'SIGNER',
        status: 'PENDING',
        order: 1,
        document: {
          id: 'doc-1',
          title: 'Test Document',
          status: 'PENDING',
          expirationDate: futureDate,
          storageType: 'REPLIT',
          file: 'documents/test.pdf',
          numPages: 3,
          teamId: 'team-1',
          fields: [
            { id: 'field-1', type: 'SIGNATURE', pageNumber: 1, x: 100, y: 200, width: 200, height: 50, recipientId: 'recipient-1', required: true },
            { id: 'field-2', type: 'DATE', pageNumber: 1, x: 350, y: 200, width: 100, height: 30, recipientId: 'recipient-1', required: true },
          ],
          team: { name: 'Test Team' },
        },
      });

      (mockPrisma.signatureRecipient.update as jest.Mock).mockResolvedValue({});

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'test-token' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.fields).toBeDefined();
      expect(data.fields.length).toBe(2);
      expect(data.fields[0].type).toBe('SIGNATURE');
    });

    it('includes team name in document response', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      (mockPrisma.signatureRecipient.findUnique as jest.Mock).mockResolvedValue({
        id: 'recipient-1',
        signingToken: 'test-token',
        email: 'signer@example.com',
        name: 'Test Signer',
        role: 'SIGNER',
        status: 'PENDING',
        order: 1,
        document: {
          id: 'doc-1',
          title: 'Investment Agreement',
          status: 'PENDING',
          expirationDate: futureDate,
          storageType: 'REPLIT',
          file: 'documents/test.pdf',
          numPages: 5,
          teamId: 'team-1',
          fields: [],
          team: { name: 'BF Fund GP' },
        },
      });

      (mockPrisma.signatureRecipient.update as jest.Mock).mockResolvedValue({});

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { token: 'test-token' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.document.teamName).toBe('BF Fund GP');
    });
  });

  describe('Method validation', () => {
    it('returns 405 for unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { token: 'test-token' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({ message: 'Method not allowed' });
    });
  });
});
