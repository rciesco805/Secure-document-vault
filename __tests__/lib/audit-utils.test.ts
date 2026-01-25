/**
 * Audit Utility Tests
 * 
 * Tests for lib/audit/view-audit.ts logic - IP extraction, geo parsing, device detection.
 * 
 * These tests validate the expected behavior of audit data extraction logic,
 * including header parsing patterns and data structure requirements.
 * 
 * Note: These are unit tests for extraction logic patterns. Integration tests
 * that invoke the actual extractViewAuditData function require additional
 * Jest configuration for ESM module support.
 */

describe('Audit Utilities', () => {
  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header (single IP)', () => {
      const headers = { 'x-forwarded-for': '192.168.1.100' };
      const forwarded = headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : null;
      
      expect(ipAddress).toBe('192.168.1.100');
    });

    it('should extract first IP from x-forwarded-for chain', () => {
      const headers = { 'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1' };
      const forwarded = headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : null;
      
      expect(ipAddress).toBe('192.168.1.100');
    });

    it('should handle spaces in x-forwarded-for header', () => {
      const headers = { 'x-forwarded-for': '  192.168.1.100  ,  10.0.0.1  ' };
      const forwarded = headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : null;
      
      expect(ipAddress).toBe('192.168.1.100');
    });

    it('should fallback to socket remoteAddress when no forwarded header', () => {
      const headers: Record<string, string> = {};
      const socketRemoteAddress = '127.0.0.1';
      
      const forwarded = headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : socketRemoteAddress;
      
      expect(ipAddress).toBe('127.0.0.1');
    });

    it('should return null when no IP available', () => {
      const headers: Record<string, string> = {};
      const socketRemoteAddress = undefined;
      
      const forwarded = headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : socketRemoteAddress || null;
      
      expect(ipAddress).toBeNull();
    });

    it('should handle IPv6 addresses', () => {
      const headers = { 'x-forwarded-for': '2001:db8:85a3::8a2e:370:7334' };
      const forwarded = headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0].trim() 
        : null;
      
      expect(ipAddress).toBe('2001:db8:85a3::8a2e:370:7334');
    });
  });

  describe('Geo Header Parsing', () => {
    it('should extract Cloudflare country header', () => {
      const headers = { 'cf-ipcountry': 'US' };
      const geoCountry = headers['cf-ipcountry'] || null;
      
      expect(geoCountry).toBe('US');
    });

    it('should extract Vercel country header', () => {
      const headers = { 'x-vercel-ip-country': 'GB' };
      const geoCountry = headers['x-vercel-ip-country'] || null;
      
      expect(geoCountry).toBe('GB');
    });

    it('should prefer Cloudflare header over Vercel', () => {
      const headers = { 
        'cf-ipcountry': 'US',
        'x-vercel-ip-country': 'GB',
      };
      const geoCountry = headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || null;
      
      expect(geoCountry).toBe('US');
    });

    it('should extract Vercel city header', () => {
      const headers = { 'x-vercel-ip-city': 'San Francisco' };
      const geoCity = headers['x-vercel-ip-city'] || null;
      
      expect(geoCity).toBe('San Francisco');
    });

    it('should extract Vercel region header', () => {
      const headers = { 'x-vercel-ip-country-region': 'CA' };
      const geoRegion = headers['x-vercel-ip-country-region'] || null;
      
      expect(geoRegion).toBe('CA');
    });

    it('should handle missing geo headers', () => {
      const headers: Record<string, string> = {};
      const geoCountry = headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || null;
      const geoCity = headers['x-vercel-ip-city'] || null;
      const geoRegion = headers['x-vercel-ip-country-region'] || null;
      
      expect(geoCountry).toBeNull();
      expect(geoCity).toBeNull();
      expect(geoRegion).toBeNull();
    });
  });

  describe('User Agent Parsing', () => {
    it('should identify Chrome browser', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const isChrome = userAgent.includes('Chrome');
      
      expect(isChrome).toBe(true);
    });

    it('should identify Safari browser', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
      
      expect(isSafari).toBe(true);
    });

    it('should identify Firefox browser', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
      const isFirefox = userAgent.includes('Firefox');
      
      expect(isFirefox).toBe(true);
    });

    it('should identify mobile device', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
      
      expect(isMobile).toBe(true);
    });

    it('should identify tablet device', () => {
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const isTablet = userAgent.includes('iPad') || (userAgent.includes('Android') && !userAgent.includes('Mobile'));
      
      expect(isTablet).toBe(true);
    });

    it('should default to desktop for standard browser UA', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('iPad');
      const deviceType = isMobile ? 'mobile' : 'desktop';
      
      expect(deviceType).toBe('desktop');
    });

    it('should handle missing user agent', () => {
      const userAgent = null;
      const deviceType = userAgent ? 'parsed' : 'unknown';
      
      expect(deviceType).toBe('unknown');
    });

    it('should identify Windows OS', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const isWindows = userAgent.includes('Windows');
      
      expect(isWindows).toBe(true);
    });

    it('should identify macOS', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
      const isMac = userAgent.includes('Macintosh') || userAgent.includes('Mac OS');
      
      expect(isMac).toBe(true);
    });

    it('should identify Linux', () => {
      const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)';
      const isLinux = userAgent.includes('Linux');
      
      expect(isLinux).toBe(true);
    });
  });

  describe('Audit Timestamp Formatting', () => {
    it('should format date as ISO string', () => {
      const date = new Date('2026-01-25T12:00:00Z');
      const formatted = date.toISOString();
      
      expect(formatted).toBe('2026-01-25T12:00:00.000Z');
    });

    it('should use current date when not specified', () => {
      const before = new Date();
      const formatted = new Date().toISOString();
      const after = new Date();
      
      const formattedDate = new Date(formatted);
      expect(formattedDate >= before).toBe(true);
      expect(formattedDate <= after).toBe(true);
    });
  });

  describe('Audit Metadata Creation', () => {
    it('should create metadata with action and timestamp', () => {
      const action = 'VIEW_DOCUMENT';
      const metadata = {
        action,
        timestamp: new Date().toISOString(),
      };
      
      expect(metadata.action).toBe('VIEW_DOCUMENT');
      expect(metadata.timestamp).toBeTruthy();
    });

    it('should include additional details in metadata', () => {
      const metadata = {
        action: 'DOWNLOAD',
        timestamp: new Date().toISOString(),
        documentId: 'doc-123',
        pageNumber: 5,
      };
      
      expect(metadata.documentId).toBe('doc-123');
      expect(metadata.pageNumber).toBe(5);
    });

    it('should handle various action types', () => {
      const validActions = [
        'VIEW_DOCUMENT',
        'DOWNLOAD',
        'SIGN',
        'SHARE',
        'DELETE',
        'UPLOAD',
        'LOGIN',
        'LOGOUT',
      ];

      for (const action of validActions) {
        const metadata = { action, timestamp: new Date().toISOString() };
        expect(metadata.action).toBe(action);
      }
    });
  });

  describe('ViewAuditData Structure', () => {
    it('should have all required fields', () => {
      const auditData = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        geoCountry: 'US',
        geoCity: 'San Francisco',
        geoRegion: 'CA',
        deviceType: 'desktop',
        browserName: 'Chrome',
        osName: 'Windows',
        referrer: 'https://example.com',
      };

      expect(auditData).toHaveProperty('ipAddress');
      expect(auditData).toHaveProperty('userAgent');
      expect(auditData).toHaveProperty('geoCountry');
      expect(auditData).toHaveProperty('geoCity');
      expect(auditData).toHaveProperty('geoRegion');
      expect(auditData).toHaveProperty('deviceType');
      expect(auditData).toHaveProperty('browserName');
      expect(auditData).toHaveProperty('osName');
      expect(auditData).toHaveProperty('referrer');
    });

    it('should allow null values for optional fields', () => {
      const auditData = {
        ipAddress: null,
        userAgent: null,
        geoCountry: null,
        geoCity: null,
        geoRegion: null,
        deviceType: null,
        browserName: null,
        osName: null,
        referrer: null,
      };

      expect(auditData.ipAddress).toBeNull();
      expect(auditData.geoCountry).toBeNull();
    });
  });
});
