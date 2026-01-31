# BF Fund Investor Dataroom

### Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners. Its business vision is to provide a comprehensive and compliant solution for investor management, targeting fund managers looking to enhance efficiency and transparency with their limited partners. The project aims to become the leading platform for investor relations in the private equity and venture capital space.

**Production Domain**: https://dataroom.bermudafranchisegroup.com

### User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

---

## Recent Changes

### January 31, 2026 - Magic Link Security Fix (CRITICAL)

**Problem Solved**: Email security scanners were consuming magic link tokens before users could click them, because the email contained the actual NextAuth callback URL (with token) in the verification_url parameter. Users saw "This link has already been used or has expired" error.

**Solution Implemented**:
1. Created new `MagicLinkCallback` database table to store callback URLs server-side
2. Email now only contains an opaque ID + checksum (no callback URL visible to scanners)
3. Verify page uses two-phase flow:
   - On page load: validates link exists (`action="validate"`) without consuming it
   - On button click: consumes the link and returns callback URL (`action="sign_in"`)
4. Token correlation: Stores SHA-256 hash of original NextAuth token (`authTokenHash`) to ensure exact match
5. Server returns the stored callback URL only when user explicitly clicks "Sign In to Portal"

**Database Changes**:
```sql
-- New table added to prisma/schema.prisma
model MagicLinkCallback {
  id              String   @id @default(cuid())
  identifier      String   -- email address
  token           String   @unique -- random secure token for the email link
  callbackUrl     String   -- the actual NextAuth callback URL (hidden from email)
  authTokenHash   String   -- SHA-256 hash of NextAuth verification token
  expires         DateTime
  consumed        Boolean  @default(false)
  createdAt       DateTime @default(now())
}
```

**Files Changed**:
- `prisma/schema.prisma` - Added MagicLinkCallback model with authTokenHash field
- `lib/emails/send-verification-request.ts` - Stores callback URL in DB, extracts and hashes auth token, sends only ID+checksum in email
- `pages/api/auth/verify-link.ts` - Accepts action parameter (validate/sign_in), validates token hash match, returns callback URL only on sign_in
- `app/(auth)/verify/page-client.tsx` - Two-phase validation flow with loading states

**How Magic Links Now Work**:
1. User requests login → NextAuth creates VerificationToken
2. `sendVerificationRequestEmail` extracts the token from callback URL, hashes it, stores in MagicLinkCallback
3. Email sent with `/verify?id=<random_id>&checksum=<hmac>`
4. User clicks email link → verify page loads → validates link exists (doesn't consume)
5. User clicks "Sign In to Portal" → API marks MagicLinkCallback as consumed → returns callback URL
6. Browser redirects to callback URL → NextAuth consumes VerificationToken → user logged in

---

### January 31, 2026 - Comprehensive Audit Logging

**Unified Audit Logger** (`lib/audit/audit-logger.ts`):
- Centralized logging utility with typed event types and resource types
- Helper functions for view, sign, subscribe, payment, accreditation, and certificate events
- Consistent IP address and user agent capture from requests using `logAuditEventFromRequest()`

**Audit Event Types Covered**:
| Event Type | Description | Logged In |
|------------|-------------|-----------|
| DOCUMENT_VIEWED | Investor viewed a document | Signature webhook |
| DOCUMENT_SIGNED | Recipient signed a document | Signature webhook |
| DOCUMENT_COMPLETED | All recipients finished signing | Signature webhook |
| DOCUMENT_DECLINED | Recipient declined to sign | Signature webhook |
| SUBSCRIPTION_CREATED | Investor subscribed to fund | `/api/lp/subscribe` |
| SUBSCRIPTION_PAYMENT_INITIATED | Payment started | `/api/lp/subscription/process-payment` |
| SUBSCRIPTION_PAYMENT_RECORDED | Payment completed | `/api/lp/subscription/process-payment` |
| ACCREDITATION_SUBMITTED | Investor submitted accreditation | `/api/lp/accreditation` |
| ACCREDITATION_AUTO_APPROVED | Auto-approved high-value investor | `/api/lp/accreditation` |
| CERTIFICATE_DOWNLOADED | Completion certificate downloaded | `/api/signature/certificate/[documentId]/download` |

**GP Audit Export Endpoint** (`/api/admin/audit/export`):
- JSON and CSV export formats
- Filter by date range, event type, resource type
- Team-scoped access control for OWNER/ADMIN/SUPER_ADMIN roles

**Files Created/Enhanced**:
- `lib/audit/audit-logger.ts` - Unified audit logging utility with helper functions
- `pages/api/admin/audit/export.ts` - GP audit export endpoint
- `pages/api/webhooks/signature.ts` - Added audit events for all document lifecycle events
- `pages/api/lp/subscribe.ts` - Added SUBSCRIPTION_CREATED audit
- `pages/api/lp/accreditation.ts` - Added accreditation audit events
- `pages/api/lp/subscription/process-payment.ts` - Migrated to unified logger
- `pages/api/signature/certificate/[documentId]/download.ts` - Added certificate download audit

---

### January 31, 2026 - E-Sign Auto-Certificate & Accreditation Enhancement

**Auto-Certificate Generation**:
- SignatureDocument schema enhanced with certificate fields (certificateFile, certificateHash, certificateId, certificateGeneratedAt)
- Auto-certificate service generates PDF completion certificates on document completion
- Certificates stored in object storage with SHA-256 hash verification
- Download endpoint at `/api/signature/certificate/[documentId]/download`
- Webhook triggers certificate generation automatically when all recipients sign

**Accreditation SEC Guidance Auto-Approval**:
- AccreditationAck enhanced with auto-approval fields (autoApproved, needsManualReview, reviewedBy, commitmentAmount)
- Auto-approval logic: minimum commitment + self-attestation = auto-approve
- High-value investors ($200k+) eligible for simplified verification path via `SELF_ATTEST_HIGH_VALUE` method
- Below-threshold submissions flagged for manual GP/admin review
- Full audit trail with approval reason tracking

**Files Created/Enhanced**:
- `lib/signature/auto-certificate.ts` - Certificate generation service
- `pages/api/signature/certificate/[documentId]/download.ts` - Certificate download API
- `lib/webhook/triggers/signature-events.ts` - Auto-certificate trigger on completion
- `pages/api/lp/accreditation.ts` - SEC guidance auto-approval logic

---

### January 31, 2026 - LP Dashboard Payment Flow Integration

**Complete Subscription Lifecycle**:
- Enhanced subscription-status API to track all states: PENDING → SIGNED → PAYMENT_PROCESSING → COMPLETED
- SubscriptionBanner now supports 6 states with distinct UI for each phase
- Duplicate subscription prevention: canSubscribe=false while any subscription in flight
- Payment processing banner shows animated spinner with ACH timing info
- Completed state shows green success checkmark with investment summary

**Files Enhanced**:
- `pages/api/lp/subscription-status.ts` - Added processingSubscription tracking
- `components/lp/subscription-banner.tsx` - Added processing/completed states
- `app/lp/dashboard/page-client.tsx` - Full state mapping and payment flow

---

### January 31, 2026 - Phase 1 Roadmap Implementation

**1. Subscription → Payment Flow Integration**:
- Created `/api/lp/subscription/process-payment` endpoint
- Post-e-sign Plaid ACH trigger for automated subscription payments
- Transaction status tracking: PENDING → PROCESSING → COMPLETED/FAILED
- Audit logging for payment initiation events
- Bank account verification before processing

**2. E-Sign Webhook System**:
- Created `/api/webhooks/signature` endpoint for real-time events
- Supported events: document.signed, document.completed, document.viewed, document.declined
- Auto-updates subscription status to "SIGNED" when all recipients sign
- Triggers completion notification emails with certificate links
- HMAC-SHA256 signature verification for webhook security

**3. 506(c) Verification Simplification**:
- Enhanced `/api/lp/accreditation` endpoint with simplified path
- High-value investors ($200k+) qualify for auto-approval with self-attestation
- Reduced friction for qualified accredited investors
- Maintains full compliance audit trail

---

## System Architecture

**Tech Stack**:
- **Framework**: Next.js 16.1.6 (App Router)
- **Runtime**: React 19.2.4
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x, shadcn/ui
- **Database**: PostgreSQL 16 via Prisma ORM
- **Authentication**: NextAuth.js with database sessions
- **Node**: Node.js 22
- **Push Notifications**: web-push (Web Push API)

**Core Features**:
- **506(c) Compliance**: Accreditation workflow, audit logging, KYC/AML via Persona, investor qualification
- **Self-hosted E-Signature**: ESIGN/UETA compliant, consent capture, document checksums, completion certificates, multiple font styles
- **LP Portal (Investor Portal)**: Personalized dashboards, role-based access control, watermarked document viewing, investment tracking
- **Admin Dashboards**: CRM timeline, capital tracking, compliance audit trails, user management, fund analytics
- **Payment Flows**: Plaid ACH for capital calls, Stripe for billing, KYC enforcement, transaction history
- **PWA Support**: Offline access, service worker caching (v5), auto-updates, offline document viewing
- **Push Notifications**: Real-time alerts for document views, signatures, capital calls, and distributions
- **Advanced Reporting**: Custom report builder with 8 report types, scheduled reports, PDF/CSV/Excel export
- **Security**: Four-layer encryption (TLS 1.3, Client-Side AES-256-GCM, Server-Side AES-256-GCM, PDF 2.0 AES-256)

**Authentication System**:
- **Providers**: NextAuth.js with magic links (email), Google OAuth, LinkedIn OAuth
- **Session Strategy**: Database sessions (30-day max age, 24-hour refresh)
- **Magic Link Flow**: Two-step verification at `/verify` prevents email scanners from consuming tokens. Callback URLs stored server-side in MagicLinkCallback table. Users must manually click "Sign In to Portal" button.
- **Token Security**: HMAC-SHA256 checksum prevents URL tampering. Token hash correlation ensures original token match.
- **Admin Verification**: Checks static admin list + database UserTeam roles

**Role System**:
- **User.role** (GP/LP distinction): `GP` (General Partner), `LP` (Limited Partner)
- **UserTeam.role** (Admin hierarchy): `OWNER`, `SUPER_ADMIN`, `ADMIN`

---

## External Dependencies

| Service | Purpose |
|---------|---------|
| **Resend** | Transactional email |
| **Persona** | KYC/AML verification |
| **Plaid** | Bank connectivity for ACH payments |
| **Tinybird** | Real-time analytics |
| **Stripe** | Platform billing |
| **Rollbar** | Error monitoring |
| **PostHog** | Product analytics |
| **Google OAuth** | Admin authentication |
| **OpenAI** | AI features |
| **Replit Object Storage** | Document storage (default) |
| **Web Push** | Push notifications |

---

## Key API Endpoints

### Authentication
- `POST /api/auth/verify-link` - Validates and consumes magic link tokens (action: validate/sign_in)
- `GET /api/auth/session` - Get current session

### LP (Investor) Endpoints
- `POST /api/lp/subscribe` - Create fund subscription
- `GET /api/lp/subscription-status` - Get subscription lifecycle status
- `POST /api/lp/subscription/process-payment` - Process Plaid ACH payment
- `POST /api/lp/accreditation` - Submit accreditation with auto-approval

### Admin Endpoints
- `GET /api/admin/audit/export` - Export audit logs (JSON/CSV)

### Webhooks
- `POST /api/webhooks/signature` - E-signature lifecycle events

### Signature/Certificate
- `GET /api/signature/certificate/[documentId]/download` - Download completion certificate

---

## Database Models (Key)

- **User** - Platform users (GP/LP)
- **Team** - Fund/organization
- **Investor** - LP investor profiles
- **Fund** - Investment fund details
- **Subscription** - Fund subscriptions
- **Transaction** - Payment transactions
- **SignatureDocument** - E-signature documents with certificate fields
- **SignatureRecipient** - Document recipients
- **VerificationToken** - NextAuth magic link tokens
- **MagicLinkCallback** - Secure callback URL storage (prevents scanner consumption)
- **AccreditationAck** - Accreditation submissions with auto-approval fields
- **AuditLog** - Compliance audit trail
