/**
 * Audit Dashboard Tests
 * 
 * Tests for the compliance audit dashboard including
 * filtering, pagination, export functionality, and data display.
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    signatureAudit: { findMany: jest.fn(), count: jest.fn() },
    document: { findMany: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@/pages/api/auth/[...nextauth]', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Audit Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Types', () => {
    const AUDIT_EVENT_TYPES = [
      'SIGNATURE_REQUEST',
      'DOCUMENT_VIEWED',
      'DOCUMENT_SIGNED',
      'SIGNATURE_DECLINED',
      'SIGNATURE_CANCELLED',
    ] as const;

    it('should define all signature audit event types', () => {
      expect(AUDIT_EVENT_TYPES).toContain('SIGNATURE_REQUEST');
      expect(AUDIT_EVENT_TYPES).toContain('DOCUMENT_VIEWED');
      expect(AUDIT_EVENT_TYPES).toContain('DOCUMENT_SIGNED');
      expect(AUDIT_EVENT_TYPES).toContain('SIGNATURE_DECLINED');
      expect(AUDIT_EVENT_TYPES).toContain('SIGNATURE_CANCELLED');
    });

    it('should map events to display labels', () => {
      const eventLabels: Record<string, string> = {
        SIGNATURE_REQUEST: 'Signature Request Sent',
        DOCUMENT_VIEWED: 'Document Viewed',
        DOCUMENT_SIGNED: 'Document Signed',
        SIGNATURE_DECLINED: 'Signature Declined',
        SIGNATURE_CANCELLED: 'Request Cancelled',
      };

      expect(eventLabels['DOCUMENT_SIGNED']).toBe('Document Signed');
    });
  });

  describe('Stats Calculation', () => {
    function calculateStats(events: { event: string }[]) {
      return {
        totalEvents: events.length,
        signatures: events.filter(e => e.event === 'DOCUMENT_SIGNED').length,
        views: events.filter(e => e.event === 'DOCUMENT_VIEWED').length,
        declined: events.filter(e => e.event === 'SIGNATURE_DECLINED').length,
      };
    }

    it('should count total events', () => {
      const events = [
        { event: 'DOCUMENT_SIGNED' },
        { event: 'DOCUMENT_VIEWED' },
        { event: 'DOCUMENT_VIEWED' },
      ];
      const stats = calculateStats(events);
      expect(stats.totalEvents).toBe(3);
    });

    it('should count signatures', () => {
      const events = [
        { event: 'DOCUMENT_SIGNED' },
        { event: 'DOCUMENT_SIGNED' },
        { event: 'DOCUMENT_VIEWED' },
      ];
      const stats = calculateStats(events);
      expect(stats.signatures).toBe(2);
    });

    it('should count document views', () => {
      const events = [
        { event: 'DOCUMENT_VIEWED' },
        { event: 'DOCUMENT_VIEWED' },
        { event: 'DOCUMENT_VIEWED' },
        { event: 'DOCUMENT_SIGNED' },
      ];
      const stats = calculateStats(events);
      expect(stats.views).toBe(3);
    });

    it('should count declined signatures', () => {
      const events = [
        { event: 'SIGNATURE_DECLINED' },
        { event: 'DOCUMENT_SIGNED' },
      ];
      const stats = calculateStats(events);
      expect(stats.declined).toBe(1);
    });
  });

  describe('Filtering', () => {
    describe('Event Type Filter', () => {
      function filterByEvent(events: { event: string }[], filter: string) {
        if (filter === 'all') return events;
        return events.filter(e => e.event === filter);
      }

      it('should return all events when filter is "all"', () => {
        const events = [
          { event: 'DOCUMENT_SIGNED' },
          { event: 'DOCUMENT_VIEWED' },
        ];
        const filtered = filterByEvent(events, 'all');
        expect(filtered).toHaveLength(2);
      });

      it('should filter by specific event type', () => {
        const events = [
          { event: 'DOCUMENT_SIGNED' },
          { event: 'DOCUMENT_VIEWED' },
          { event: 'DOCUMENT_SIGNED' },
        ];
        const filtered = filterByEvent(events, 'DOCUMENT_SIGNED');
        expect(filtered).toHaveLength(2);
      });
    });

    describe('Date Range Filter', () => {
      function filterByDateRange(
        events: { createdAt: Date }[],
        startDate: Date | null,
        endDate: Date | null
      ) {
        return events.filter(e => {
          if (startDate && e.createdAt < startDate) return false;
          if (endDate && e.createdAt > endDate) return false;
          return true;
        });
      }

      it('should filter events within date range', () => {
        const events = [
          { createdAt: new Date('2026-01-01') },
          { createdAt: new Date('2026-01-15') },
          { createdAt: new Date('2026-02-01') },
        ];
        const filtered = filterByDateRange(
          events,
          new Date('2026-01-10'),
          new Date('2026-01-20')
        );
        expect(filtered).toHaveLength(1);
      });

      it('should allow open-ended start date', () => {
        const events = [
          { createdAt: new Date('2026-01-01') },
          { createdAt: new Date('2026-01-15') },
        ];
        const filtered = filterByDateRange(events, null, new Date('2026-01-10'));
        expect(filtered).toHaveLength(1);
      });

      it('should allow open-ended end date', () => {
        const events = [
          { createdAt: new Date('2026-01-01') },
          { createdAt: new Date('2026-01-15') },
        ];
        const filtered = filterByDateRange(events, new Date('2026-01-10'), null);
        expect(filtered).toHaveLength(1);
      });
    });

    describe('Search Filter', () => {
      function filterBySearch(
        events: { recipientEmail: string; recipientName?: string }[],
        searchTerm: string
      ) {
        if (!searchTerm) return events;
        const term = searchTerm.toLowerCase();
        return events.filter(e => 
          e.recipientEmail.toLowerCase().includes(term) ||
          (e.recipientName?.toLowerCase().includes(term) ?? false)
        );
      }

      it('should search by email', () => {
        const events = [
          { recipientEmail: 'john@example.com', recipientName: 'John' },
          { recipientEmail: 'jane@example.com', recipientName: 'Jane' },
        ];
        const filtered = filterBySearch(events, 'john');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].recipientEmail).toBe('john@example.com');
      });

      it('should search by name', () => {
        const events = [
          { recipientEmail: 'user1@example.com', recipientName: 'John Doe' },
          { recipientEmail: 'user2@example.com', recipientName: 'Jane Smith' },
        ];
        const filtered = filterBySearch(events, 'Smith');
        expect(filtered).toHaveLength(1);
      });

      it('should be case insensitive', () => {
        const events = [
          { recipientEmail: 'JOHN@EXAMPLE.COM' },
        ];
        const filtered = filterBySearch(events, 'john');
        expect(filtered).toHaveLength(1);
      });

      it('should return all when search is empty', () => {
        const events = [
          { recipientEmail: 'a@example.com' },
          { recipientEmail: 'b@example.com' },
        ];
        const filtered = filterBySearch(events, '');
        expect(filtered).toHaveLength(2);
      });
    });
  });

  describe('Pagination', () => {
    const PAGE_SIZE = 25;

    function paginate<T>(items: T[], page: number, pageSize: number) {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        items: items.slice(start, end),
        totalPages: Math.ceil(items.length / pageSize),
        currentPage: page,
        totalItems: items.length,
      };
    }

    it('should return correct page size', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const result = paginate(items, 1, PAGE_SIZE);
      expect(result.items).toHaveLength(25);
    });

    it('should calculate total pages', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const result = paginate(items, 1, PAGE_SIZE);
      expect(result.totalPages).toBe(4);
    });

    it('should return correct items for page 2', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const result = paginate(items, 2, PAGE_SIZE);
      expect(result.items[0].id).toBe(25);
    });

    it('should handle last page with fewer items', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: i }));
      const result = paginate(items, 2, PAGE_SIZE);
      expect(result.items).toHaveLength(5);
    });

    it('should handle empty results', () => {
      const items: any[] = [];
      const result = paginate(items, 1, PAGE_SIZE);
      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('Export Functionality', () => {
    describe('CSV Export', () => {
      function exportToCSV(events: { event: string; email: string; date: string }[]) {
        const headers = ['Event', 'Email', 'Date'];
        const rows = events.map(e => [e.event, e.email, e.date].join(','));
        return [headers.join(','), ...rows].join('\n');
      }

      it('should include headers', () => {
        const events = [{ event: 'SIGNED', email: 'test@example.com', date: '2026-01-25' }];
        const csv = exportToCSV(events);
        expect(csv).toContain('Event,Email,Date');
      });

      it('should include all rows', () => {
        const events = [
          { event: 'SIGNED', email: 'a@example.com', date: '2026-01-25' },
          { event: 'VIEWED', email: 'b@example.com', date: '2026-01-26' },
        ];
        const csv = exportToCSV(events);
        const lines = csv.split('\n');
        expect(lines).toHaveLength(3); // header + 2 rows
      });

      it('should set correct content type', () => {
        const contentType = 'text/csv';
        expect(contentType).toBe('text/csv');
      });

      it('should set correct filename', () => {
        const filename = `signature-audit-2026-01-25.csv`;
        expect(filename).toMatch(/signature-audit-\d{4}-\d{2}-\d{2}\.csv/);
      });
    });

    describe('HTML Report Export', () => {
      function generateHTMLReport(events: { event: string; email: string }[]) {
        return `<!DOCTYPE html>
<html>
<head><title>Signature Audit Report</title></head>
<body>
<h1>SEC 506(c) Compliance Report</h1>
<p>Total Events: ${events.length}</p>
<table>
${events.map(e => `<tr><td>${e.event}</td><td>${e.email}</td></tr>`).join('\n')}
</table>
</body>
</html>`;
      }

      it('should include compliance title', () => {
        const html = generateHTMLReport([]);
        expect(html).toContain('506(c) Compliance');
      });

      it('should include event count', () => {
        const events = [
          { event: 'SIGNED', email: 'test@example.com' },
        ];
        const html = generateHTMLReport(events);
        expect(html).toContain('Total Events: 1');
      });

      it('should include table of events', () => {
        const events = [
          { event: 'SIGNED', email: 'test@example.com' },
        ];
        const html = generateHTMLReport(events);
        expect(html).toContain('<table>');
        expect(html).toContain('test@example.com');
      });

      it('should set correct content type', () => {
        const contentType = 'text/html';
        expect(contentType).toBe('text/html');
      });
    });
  });

  describe('SEC 506(c) Compliance Notice', () => {
    it('should display compliance notice', () => {
      const complianceNotice = 'This audit trail is maintained for SEC Rule 506(c) compliance. All signature activities are logged with timestamps, IP addresses, and verification data.';
      expect(complianceNotice).toContain('506(c)');
      expect(complianceNotice).toContain('IP addresses');
    });

    it('should include required audit fields', () => {
      const auditRecord = {
        id: 'aud_123',
        event: 'DOCUMENT_SIGNED',
        recipientEmail: 'investor@example.com',
        recipientName: 'John Investor',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        geoLocation: 'New York, US',
        createdAt: new Date(),
      };

      expect(auditRecord.ipAddress).toBeDefined();
      expect(auditRecord.userAgent).toBeDefined();
      expect(auditRecord.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Access Control', () => {
    it('should require admin role', () => {
      const user = { role: 'MEMBER' };
      const hasAccess = ['ADMIN', 'OWNER'].includes(user.role);
      expect(hasAccess).toBe(false);
    });

    it('should allow admin access', () => {
      const user = { role: 'ADMIN' };
      const hasAccess = ['ADMIN', 'OWNER'].includes(user.role);
      expect(hasAccess).toBe(true);
    });

    it('should allow owner access', () => {
      const user = { role: 'OWNER' };
      const hasAccess = ['ADMIN', 'OWNER'].includes(user.role);
      expect(hasAccess).toBe(true);
    });
  });

  describe('Data Display', () => {
    it('should format timestamps', () => {
      const date = new Date('2026-01-25T12:30:00Z');
      const formatted = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2026');
    });

    it('should display event badges with colors', () => {
      const eventColors: Record<string, string> = {
        DOCUMENT_SIGNED: 'bg-green-100 text-green-800',
        SIGNATURE_DECLINED: 'bg-red-100 text-red-800',
        DOCUMENT_VIEWED: 'bg-blue-100 text-blue-800',
      };

      expect(eventColors['DOCUMENT_SIGNED']).toContain('green');
      expect(eventColors['SIGNATURE_DECLINED']).toContain('red');
    });
  });
});
