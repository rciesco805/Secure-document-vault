# Security Policy

## Overview

BF Fund Investor Dataroom is designed with security as a core principle. This document outlines implemented security controls, known limitations, and vulnerability reporting procedures.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: security@bermudafranchisegroup.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Any suggested remediation

We aim to respond within 48 hours and will work with you to understand and address the issue.

## Operational Requirements

Before deploying, ensure:
- **TLS Termination**: Deploy behind a reverse proxy or edge provider that enforces HTTPS (e.g., Vercel, Cloudflare, AWS ALB)
- **Environment Variables**: Configure all required secrets via secure secret management

## Implemented Security Controls

### Transport Security

- **TLS**: Requires deployment behind TLS-terminating proxy (application does not handle TLS directly)
- **HSTS**: Strict-Transport-Security header set in production responses - see `lib/middleware/csp.ts:153-157`

### Authentication & Authorization

**Implemented:**
- **NextAuth.js**: Database-backed sessions with secure cookies
- **Magic Links**: Email-based authentication for LP users
- **Google OAuth**: Admin/GP authentication
- **Session Security** (verified in `lib/auth/auth-options.ts`):
  - HttpOnly cookies
  - Secure flag (HTTPS only)
  - SameSite attribute configured

**Role-Based Access Control:**
- LP (Limited Partner): Access to personal documents, subscriptions, portal
- GP (General Partner): Fund management, investor oversight
- Admin: Full platform access, user management
- Viewer: Read-only document access

### Data Encryption

**Implemented (when configured):**
- **Server-Side Encryption**: AES-256-GCM encryption available in storage pipeline - see `lib/storage/encryption/crypto-service.ts`
- **Encryption Activation**: Requires `STORAGE_ENCRYPTION_KEY` environment variable (64-character hex string)
- **Scope**: Encryption applies to files processed through the unified storage abstraction layer

**Not Yet Implemented:**
- Client-side encryption before upload
- PDF-level encryption for sensitive documents

### Content Security Policy (CSP)

**Implemented** (see `lib/middleware/csp.ts`):
- Nonce-based script execution
- Strict domain whitelisting for scripts, connections, images
- Frame-ancestors restrictions (DENY by default)
- WASM support for PDF processing

### Security Headers

**Implemented** (see `lib/middleware/csp.ts`):

| Header | Value | Status |
|--------|-------|--------|
| Content-Security-Policy | Nonce-based | :white_check_mark: |
| X-Content-Type-Options | nosniff | :white_check_mark: |
| X-Frame-Options | DENY / SAMEORIGIN | :white_check_mark: |
| Referrer-Policy | strict-origin-when-cross-origin | :white_check_mark: |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | :white_check_mark: |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | :white_check_mark: |

### Input Validation & Sanitization

**Implemented:**
- **sanitize-html** (`lib/utils/sanitize-html.ts`): Strips all HTML tags from user content
  - Used in: team name updates, branding settings, agreements, conversation features
- **Path sanitization** (`middleware.ts:53-58`): Removes `..` sequences and normalizes slashes
- **Host validation** (`middleware.ts:19-29`): Validates host format and length
- **IP validation** (`middleware.ts:31-47`): Validates client IP format (IPv4/IPv6)

### Audit Logging

**Schema** (see `prisma/schema.prisma` lines 1298-1318):
- `AuditLog` model fields: id, eventType, userId, teamId, resourceType, resourceId, ipAddress, userAgent, metadata, createdAt
- Indexed on: teamId, userId, eventType, createdAt

**Usage locations:**
- Fund settings: `pages/api/funds/[fundId]/settings.ts`
- Transactions: `pages/api/transactions/index.ts`
- Data import/export: `pages/api/admin/import.ts`, `pages/api/admin/export.ts`

**Limitations:**
- Logs stored in standard PostgreSQL tables (not immutable append-only storage)
- Log retention depends on database backup policies

## Known Vulnerabilities

### Current npm Audit Status (January 2026)

As of this writing, `npm audit` reports 10 vulnerabilities in transitive dependencies:

**Moderate (9) - lodash-es prototype pollution:**
- Dependency chain: `streamdown` (package.json) -> `mermaid` -> `chevrotain` -> `lodash-es`
- Usage: `streamdown` renders AI message content - see `components/ai-elements/message.tsx`
- **Risk Acceptance**: Prototype pollution vulnerability in lodash requires specific exploitation via `_.unset`/`_.omit` functions; assess upstream input handling before enabling mermaid diagrams in production

**High (1) - Next.js DoS vulnerabilities:**
- Dependency chain: `@react-email/preview-server` (package.json devDependency) -> internal `next` package
- `@react-email/preview-server` is used for local email template development only
- **Risk Acceptance**: Package is not included in production builds; only used during development

**Status:**
- Fixes require major version upgrades with breaking changes
- Risk accepted for current usage patterns
- Run `npm audit` to verify current status before deployment

## File Upload Security

**Implemented in `lib/storage/investor-storage.ts`:**
- **Filename sanitization**: Non-alphanumeric characters replaced with underscores (line 15)
- **Content-type detection**: Based on file extension (lines 158-170)
- **Encrypted storage**: Available when `STORAGE_ENCRYPTION_KEY` is configured

**Scope limitations:**
- Upload validation applies to code paths using `investor-storage.ts`
- Other upload endpoints may have different validation; audit `pages/api/file*` and `app/` routes for coverage

**Not yet implemented:**
- Virus scanning integration (ClamAV or cloud-based)
- File content verification beyond extension/MIME type

## 506(c) Compliance

**Implemented:**
- Accreditation self-certification wizard
- Persona KYC/AML integration hooks (sandbox/production modes)
- Audit logging for verification steps

**Audit Trail Contents:**
- Timestamp (UTC)
- User ID
- Action type
- IP Address
- User Agent

## Data Retention Guidelines

Recommended retention periods for compliance:

| Data Type | Recommended Retention | Notes |
|-----------|----------------------|-------|
| Audit Logs | 7 years | SEC/FINRA compliance |
| Investor Documents | Fund lifetime + 7 years | Legal/tax requirements |
| Session Data | 30 days | Automatic expiry |
| KYC/AML Records | 5 years post-relationship | AML regulations |

**Note:** Actual retention is dependent on database backup and deletion policies configured by the operator.

## Dependency Management

### Recommended Practices
- Run `npm audit` before deployments
- Enable Dependabot or similar for automated alerts
- Review and update dependencies monthly

### Vulnerability Response Guidelines
- Critical: Patch within 24 hours
- High: Patch within 7 days
- Moderate: Patch within 30 days
- Low: Patch in next release

## Development Security

### Code Review
- All changes should require pull request review
- Security-sensitive changes should have additional scrutiny

### Secrets Management
- No secrets in code repository
- Use environment variables for configuration
- Use Replit Secrets or similar secure storage for sensitive values

## Recommended Enhancements

The following security improvements are recommended but not yet implemented:

1. **Rate Limiting**: Add per-route rate limiting to prevent abuse
2. **Anomaly Detection**: Monitor for unusual access patterns
3. **Virus Scanning**: Integrate file scanning for uploads
4. **Client-Side Encryption**: Encrypt sensitive data before transmission
5. **Immutable Audit Logs**: Use append-only storage for compliance
6. **Penetration Testing**: Conduct quarterly security assessments

## Contact

For security inquiries:
- Email: security@bermudafranchisegroup.com
- Response time: 48 hours

For general support:
- Email: support@bermudafranchisegroup.com
