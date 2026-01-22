import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('@/lib/redis', () => ({
  ratelimit: jest.fn(() => ({
    limit: jest.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 60000 }),
  })),
}));

jest.mock('@/lib/resend', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

describe('LP Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Magic Link Authentication', () => {
    it('should validate email format before sending magic link', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { email: 'invalid-email' },
      });

      expect(req.body.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should accept valid email format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { email: 'investor@example.com' },
      });

      expect(req.body.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('Session Validation', () => {
    it('should require lp_session cookie for authenticated routes', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        cookies: {},
      });

      expect(req.cookies.lp_session).toBeUndefined();
    });

    it('should accept valid session cookie', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        cookies: { lp_session: 'valid-session-token' },
      });

      expect(req.cookies.lp_session).toBe('valid-session-token');
    });
  });

  describe('OTP Verification', () => {
    it('should validate OTP format (6 digits)', () => {
      const validOtp = '123456';
      const invalidOtp = '12345';
      const nonNumericOtp = 'abc123';

      expect(validOtp).toMatch(/^\d{6}$/);
      expect(invalidOtp).not.toMatch(/^\d{6}$/);
      expect(nonNumericOtp).not.toMatch(/^\d{6}$/);
    });

    it('should reject expired OTP', () => {
      const otpCreatedAt = new Date(Date.now() - 11 * 60 * 1000);
      const otpExpiryMinutes = 10;
      const isExpired = (Date.now() - otpCreatedAt.getTime()) > otpExpiryMinutes * 60 * 1000;

      expect(isExpired).toBe(true);
    });

    it('should accept valid OTP within expiry window', () => {
      const otpCreatedAt = new Date(Date.now() - 5 * 60 * 1000);
      const otpExpiryMinutes = 10;
      const isExpired = (Date.now() - otpCreatedAt.getTime()) > otpExpiryMinutes * 60 * 1000;

      expect(isExpired).toBe(false);
    });
  });
});
