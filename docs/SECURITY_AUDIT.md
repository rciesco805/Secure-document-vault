# Security Audit Summary

Last Updated: January 29, 2026

## Dependency Audit

### Vulnerability Status
- **Critical**: 0
- **High**: 0
- **Moderate**: 6 (development dependencies only, not shipped to production)

### Moderate Vulnerabilities (Dev Only)
All moderate vulnerabilities are in development-only packages:
- `@chevrotain/cst-dts-gen`, `@chevrotain/gast`, `chevrotain` - Parser generator (dev)
- `@mermaid-js/parser` - Diagram generation (dev)
- `@react-email/preview-server` - Email preview (dev)
- `langium` - Language toolkit (dev)

**Status**: Acceptable risk - not included in production bundle.

---

## XSS Prevention Audit

### dangerouslySetInnerHTML Usage

| File | Risk | Mitigation |
|------|------|------------|
| `components/webhooks/webhook-events.tsx` | Low | Syntax highlighter output (Shiki), auto-escaped |
| `components/domains/domain-configuration.tsx` | Low | Static developer-controlled strings only |
| `components/account/upload-avatar.tsx` | Low | Developer-controlled help text |
| `components/ui/form.tsx` | Low | Developer-controlled help text |
| `components/documents/document-header.tsx` | **Fixed** | Removed dangerouslySetInnerHTML (Jan 29, 2026) |

### HTML Sanitization

The platform uses `sanitize-html` library via `lib/utils/sanitize-html.ts` for:
- User-generated content
- API inputs
- Markdown rendering

---

## Content Security Policy (CSP)

### Current Status
**Temporarily relaxed** for Next.js 16 Turbopack compatibility.

| Directive | Production Value | Notes |
|-----------|-----------------|-------|
| `script-src` | `unsafe-inline` | Temporary fix - nonce support broken in Next.js 16 |
| `style-src` | `unsafe-inline` | Required for Tailwind/shadcn |
| `wasm-unsafe-eval` | Enabled | PDF processing (pdf-lib) |
| `script-src-attr` | `none` | Blocks inline handlers |
| `frame-ancestors` | Route-based | Configurable for embeds |

### Restoration Plan
When Next.js fixes nonce propagation in Turbopack:
1. Re-enable nonce generation in `lib/middleware/csp.ts`
2. Update `_document.tsx` to apply nonces
3. Remove `unsafe-inline` from script-src
4. Test all third-party integrations

### Whitelisted Domains
See `lib/middleware/csp.ts` for current list:
- PostHog, Rollbar (analytics/monitoring)
- Stripe, Plaid, Persona (payments/KYC)
- Tinybird, Cal.com, Vercel Blob (data/scheduling/storage)

---

## Webhook Security

### Signature Verification
All webhooks verify signatures before processing:

| Service | Verification Method |
|---------|---------------------|
| Persona | HMAC-SHA256 (`PERSONA_WEBHOOK_SECRET`) |
| Plaid | JWT verification (`plaid-verification` header) |
| Stripe | `stripe.webhooks.constructEvent()` |

### Rate Limiting
- Authentication: 10 requests/hour
- Strict endpoints: 3 requests/hour
- General API: 100 requests/minute

---

## Encryption Layers

1. **Transport**: TLS 1.3 (platform-provided)
2. **Client-Side**: AES-256-GCM (Web Crypto API)
3. **Server-Side**: AES-256-GCM (Node.js crypto)
4. **PDF Level**: PDF 2.0 AES-256 (pdf-lib-plus-encrypt)

---

## Recommendations

### Immediate Actions
- [x] Fix XSS in document-header.tsx (completed Jan 29, 2026)
- [ ] Monitor Next.js releases for CSP nonce fix
- [ ] Update moderate-severity dev dependencies when patches available

### Ongoing
- Regular `npm audit` runs (monthly)
- CSP violation monitoring via `/api/csp-report`
- Rollbar error monitoring for security events

---

## Compliance Notes

- ESIGN/UETA compliant e-signatures
- 506(c) accreditation verification
- Audit trail for all signature events
- KYC/AML via Persona integration
