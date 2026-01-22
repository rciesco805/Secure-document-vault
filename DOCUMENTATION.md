# BF Fund Investor Dataroom - Complete Documentation

A comprehensive 506(c) fund GP/LP management suite with secure document sharing, self-hosted e-signatures, investor onboarding, and KYC/AML verification.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Third-Party Integrations](#third-party-integrations)
5. [Setup Guide](#setup-guide)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Platform Overview

The BF Fund Investor Dataroom is a self-hosted investor portal designed for private fund managers (GPs) to securely manage investor relationships, document sharing, and compliance requirements.

### Core Modules

| Module | Description |
|--------|-------------|
| **Investor Dataroom** | Secure document sharing with folder organization, custom branding, and analytics |
| **BF Fund Sign** | DocuSign-style e-signature platform (self-hosted, no external dependencies) |
| **LP Fundroom Portal** | Personalized investor dashboards with onboarding, document vault, and capital tracking |
| **KYC/AML Verification** | Post-subscription identity verification using Persona API |
| **Compliance Tools** | SEC 506(c) audit trails, accreditation verification, signature logging |

---

## Features

### 1. Investor Dataroom
- **Secure Document Sharing**: Upload and share documents with investors
- **Folder Hierarchy**: Organize documents in nested folder structures
- **Custom Branding**: White-label with your fund's logo and colors
- **Page-Level Analytics**: Track which pages investors view and for how long
- **Magic Link Access**: One-click email verification for secure access
- **Custom Domain Support**: Host on your own domain

### 2. BF Fund Sign (E-Signature)
Self-hosted e-signature platform inspired by DocuSign/OpenSign architecture.

| Feature | Description |
|---------|-------------|
| Drag-and-Drop Fields | Place signature, date, text, checkbox fields on PDF |
| Multi-Recipient Roles | Signer, Viewer, Approver with sequential signing |
| Reusable Templates | Create templates for subscription docs, NDAs, etc. |
| Bulk Sending | Send same document to multiple signers |
| QR Code Signing | In-person signing via mobile QR scan |
| Document Expiration | Auto-void documents after deadline |
| Correct & Resend | Fix errors without starting over |
| Audit Trail | Complete signing history with timestamps and IP addresses |
| Mobile-Optimized | Touch-friendly signing on any device |

### 3. LP Fundroom Portal
Investor-facing dashboard at `/lp/dashboard`:

- **3-Step Onboarding**: Name/email → Entity selection → Magic link verification
- **Document Vault**: All signed documents stored and accessible at `/lp/docs`
- **Pending Signatures**: "Action Required" section with direct "Sign Now" links
- **Fund Progress**: Visual fundraise progress and capital call tracking
- **Message GP**: Direct communication with fund managers
- **KYC Status**: Verification progress and status display
- **Bank Connect**: One-click bank account linking at `/lp/bank-connect` using Plaid for capital calls and distributions

### 4. NDA/Accreditation Gate
Optional investor gate before accessing fund materials:

- **Toggle Per Fund**: Enable/disable at `/settings/funds`
- **506(c) Compliance**: Captures IP address, user agent, timestamp
- **Accreditation Wizard**: 3-step guided flow for investor self-certification
- **Type Selection**: Individual, entity, qualified purchaser options

### 5. KYC/AML Verification
Post-subscription identity verification using Persona:

- **Automatic Trigger**: Starts after subscription document signing
- **Embedded Flow**: Popup-based verification (500x700px)
- **Fallback Support**: Direct link if popup is blocked
- **Status Tracking**: Pending → Approved/Declined/Needs Review
- **Webhook Updates**: Real-time status sync from Persona

### 6. Admin Tools

| Tool | Location | Description |
|------|----------|-------------|
| Fund Settings | `/settings/funds` | Toggle NDA gate, view investor counts |
| Signature Audit | `/settings/signature-audit` | Filter and export audit logs |
| Template Manager | `/settings/sign` | Create/manage signature templates |

---

## Technology Stack

### Core Framework

| Library | Version | Purpose |
|---------|---------|---------|
| [next](https://nextjs.org/) | 14.2.33 | React framework with hybrid routing |
| [typescript](https://typescriptlang.org/) | 5.x | Type-safe JavaScript |
| [react](https://react.dev/) | 18.3.1 | UI library |

### Database & ORM

| Library | Version | Purpose |
|---------|---------|---------|
| [@prisma/client](https://prisma.io/) | 6.5.0 | Type-safe database client |
| [prisma](https://prisma.io/) | 6.5.0 | Database schema management |

### Authentication

| Library | Version | Purpose |
|---------|---------|---------|
| [next-auth](https://next-auth.js.org/) | 4.24.13 | Authentication framework |
| [@next-auth/prisma-adapter](https://next-auth.js.org/) | 1.0.7 | Prisma session storage |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.0.3 | Password hashing |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.0.3 | JWT token handling |

### UI Framework

| Library | Version | Purpose |
|---------|---------|---------|
| [tailwindcss](https://tailwindcss.com/) | 3.4.18 | Utility-first CSS |
| [@radix-ui/*](https://radix-ui.com/) | Various | Accessible UI primitives |
| [lucide-react](https://lucide.dev/) | 0.556.0 | Icon library |
| [motion](https://motion.dev/) | 12.23.25 | Animations |
| [@tremor/react](https://tremor.so/) | 3.18.7 | Dashboard components |
| [sonner](https://sonner.emilkowal.ski/) | 2.0.7 | Toast notifications |

### PDF Processing

| Library | Version | Purpose |
|---------|---------|---------|
| [pdf-lib](https://pdf-lib.js.org/) | 1.17.1 | PDF creation and modification |
| [mupdf](https://mupdf.com/) | 1.26.4 | PDF rendering and text extraction |
| [react-pdf](https://react-pdf.org/) | 10.2.0 | PDF viewing in browser |
| [@pdf-lib/fontkit](https://github.com/Hopding/fontkit) | 1.1.1 | Custom font embedding |

### File Upload & Storage

| Library | Version | Purpose |
|---------|---------|---------|
| [@tus/server](https://tus.io/) | 1.10.2 | Resumable upload server |
| [@tus/s3-store](https://tus.io/) | 1.9.1 | S3 storage backend |
| [tus-js-client](https://tus.io/) | 4.3.1 | Resumable upload client |
| [@uppy/core](https://uppy.io/) | 5.2.0 | File upload UI |
| [@aws-sdk/client-s3](https://aws.amazon.com/sdk-for-javascript/) | 3.947.0 | S3 operations |
| [react-dropzone](https://react-dropzone.js.org/) | 14.3.8 | Drag-and-drop file upload |

### Form Handling

| Library | Version | Purpose |
|---------|---------|---------|
| [react-hook-form](https://react-hook-form.com/) | 7.68.0 | Form state management |
| [zod](https://zod.dev/) | 3.25.76 | Schema validation |
| [@hookform/resolvers](https://github.com/react-hook-form/resolvers) | 5.2.2 | Zod integration |

### Email

| Library | Version | Purpose |
|---------|---------|---------|
| [resend](https://resend.com/) | 6.5.2 | Transactional emails |
| [@react-email/components](https://react.email/) | 1.0.1 | Email templates |
| [@react-email/render](https://react.email/) | 2.0.0 | Email HTML rendering |

### Drag and Drop

| Library | Version | Purpose |
|---------|---------|---------|
| [@dnd-kit/core](https://dndkit.com/) | 6.3.1 | Drag-and-drop functionality |
| [@dnd-kit/sortable](https://dndkit.com/) | 10.0.0 | Sortable lists |
| [react-draggable](https://github.com/react-grid-layout/react-draggable) | 4.5.0 | Element positioning |

### AI & LLM

| Library | Version | Purpose |
|---------|---------|---------|
| [openai](https://openai.com/) | 6.10.0 | OpenAI API client |
| [@ai-sdk/openai](https://sdk.vercel.ai/) | 2.0.80 | Vercel AI SDK OpenAI |
| [ai](https://sdk.vercel.ai/) | 5.0.108 | Vercel AI SDK |

### Payments & Banking

| Library | Version | Purpose |
|---------|---------|---------|
| [plaid](https://plaid.com/) | 28.0.0 | Plaid Node.js SDK for bank connections |
| [react-plaid-link](https://github.com/plaid/react-plaid-link) | 3.6.0 | React component for Plaid Link UI |
| [jose](https://github.com/panva/jose) | 5.10.0 | JWT verification for Plaid webhooks |

### Rate Limiting & Caching

| Library | Version | Purpose |
|---------|---------|---------|
| [@upstash/redis](https://upstash.com/) | 1.35.7 | Redis client |
| [@upstash/ratelimit](https://upstash.com/) | 2.0.7 | Rate limiting |
| [@upstash/qstash](https://upstash.com/) | 2.8.4 | Background jobs |
| [bottleneck](https://github.com/SGrondin/bottleneck) | 2.19.5 | Concurrency limiting |

### Data & Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| [date-fns](https://date-fns.org/) | 3.6.0 | Date manipulation |
| [nanoid](https://github.com/ai/nanoid) | 5.1.6 | Unique ID generation |
| [swr](https://swr.vercel.app/) | 2.3.7 | Data fetching |
| [xlsx](https://sheetjs.com/) | 0.20.3 | Excel file handling |
| [exceljs](https://github.com/exceljs/exceljs) | 4.4.0 | Excel generation |
| [qrcode.react](https://github.com/zpao/qrcode.react) | 4.2.0 | QR code generation |

### Testing

| Library | Version | Purpose |
|---------|---------|---------|
| [jest](https://jestjs.io/) | 30.2.0 | Test runner |
| [@testing-library/react](https://testing-library.com/) | 16.3.2 | React testing |
| [node-mocks-http](https://github.com/howardabrams/node-mocks-http) | 1.17.2 | HTTP request mocking |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | 29.4.6 | TypeScript Jest |

---

## Third-Party Integrations

### 1. Resend (Email Service)

**Purpose**: Transactional emails for magic links, signature requests, notifications

**Library**: `resend` v6.5.2

**Setup**:
1. Create account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Generate API key

**Environment Variables**:
```
RESEND_API_KEY=re_xxxxxxxxxx
```

**Usage in Code**:
```typescript
// lib/resend.ts
import { Resend } from "resend";
export const resend = new Resend(process.env.RESEND_API_KEY);
```

---

### 2. Persona (KYC/AML)

**Purpose**: Identity verification for SEC 506(c) compliance

**Library**: Direct API integration (no SDK)

**API Documentation**: [docs.withpersona.com](https://docs.withpersona.com/reference)

**Setup**:
1. Create account at [withpersona.com](https://withpersona.com)
2. Create an Inquiry Template for investor verification
3. Configure webhook endpoint
4. Copy API credentials

**Environment Variables**:
```
PERSONA_API_KEY=persona_sandbox_xxxxxxxxxx
PERSONA_TEMPLATE_ID=itmpl_xxxxxxxxxx
PERSONA_ENVIRONMENT_ID=env_xxxxxxxxxx
PERSONA_WEBHOOK_SECRET=whs_xxxxxxxxxx
```

**Webhook Setup**:
- Endpoint: `https://your-domain.com/api/webhooks/persona`
- Events: `inquiry.completed`, `inquiry.approved`, `inquiry.declined`
- **Signature verification is REQUIRED** (returns 401 if invalid)

**Usage in Code**:
```typescript
// lib/persona.ts
import { createInquiry, getInquiry, verifyWebhookSignature } from "@/lib/persona";

// Create new verification
const inquiry = await createInquiry({
  referenceId: investorId,
  email: investor.email,
  firstName: investor.name?.split(" ")[0],
});

// Verify webhook
const isValid = verifyWebhookSignature(payload, signature, secret);
```

---

### 3. OpenAI (Optional AI Features)

**Purpose**: AI-powered document analysis, Q&A

**Library**: `openai` v6.10.0

**Setup**:
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Generate API key

**Environment Variables**:
```
OPENAI_API_KEY=sk-xxxxxxxxxx
```

---

### 4. Stripe (Payments - Optional)

**Purpose**: Subscription billing, payment processing

**Library**: `stripe` v16.12.0

**Setup**:
1. Create account at [stripe.com](https://stripe.com)
2. Copy API keys
3. Set up webhook endpoint

**Environment Variables**:
```
STRIPE_SECRET_KEY=sk_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

---

### 5. Google OAuth

**Purpose**: Admin user authentication

**Setup**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

**Environment Variables**:
```
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
```

---

### 6. Plaid (Bank Connect & ACH Transfers)

**Purpose**: Secure bank account linking and ACH transfers for capital calls and distributions

**Libraries**: 
- `plaid` v28.0.0 - Plaid Node.js SDK
- `react-plaid-link` v3.6.0 - React component for Plaid Link

**API Documentation**: [plaid.com/docs](https://plaid.com/docs/)

**Products Used**:
- **Link** - Bank account connection UI (embedded React component)
- **Auth** - Account and routing number verification
- **Transfer** - ACH debit (capital calls) and credit (distributions)
- **Balance** - Real-time balance checks

**Setup**:
1. Create account at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Get API credentials (Client ID and Secret)
3. Start with Sandbox environment for testing
4. Configure webhook endpoint for transfer status updates
5. Set up encryption key for secure token storage

**Environment Variables**:
```bash
PLAID_CLIENT_ID=xxxxxxxxxx              # From Plaid dashboard
PLAID_SECRET=xxxxxxxxxx                 # Environment-specific secret
PLAID_ENV=sandbox                       # sandbox | development | production
PLAID_WEBHOOK_URL=https://your-domain.com/api/webhooks/plaid
PLAID_TOKEN_ENCRYPTION_KEY=xxxxxxxxxx   # 32+ char key for token encryption (optional, falls back to NEXTAUTH_SECRET)
```

**Implementation (Completed)**:

#### Bank Connect Wizard (`/lp/bank-connect`)
- Full-page wizard with Plaid Link integration
- Automatic link token generation via `/api/lp/bank/link-token`
- Account selection and connection via `/api/lp/bank/connect`
- Shows connected bank details or prompts for connection
- "Connect Different Account" option for account changes

#### Security Features
| Feature | Implementation |
|---------|----------------|
| Token Encryption | AES-256-GCM encryption for all Plaid access tokens |
| Webhook Verification | JWT signature verification using jose library with Plaid's public keys |
| Production Validation | Requires `PLAID_TOKEN_ENCRYPTION_KEY` or `NEXTAUTH_SECRET` in production |

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lp/bank/link-token` | POST | Creates Plaid Link token for bank connection |
| `/api/lp/bank/connect` | POST | Exchanges public token, encrypts and stores access token |
| `/api/lp/bank/status` | GET | Returns current bank connection status |
| `/api/lp/transactions` | GET | Returns investor's transaction history |

#### Prisma Models

**BankLink Model**:
```prisma
model BankLink {
  id                String   @id @default(cuid())
  investorId        String
  plaidItemId       String   @unique
  plaidAccessToken  String   // AES-256-GCM encrypted
  plaidAccountId    String
  institutionId     String?
  institutionName   String?
  accountName       String?
  accountMask       String?  // Last 4 digits
  accountType       String?  // checking, savings
  accountSubtype    String?
  status            String   @default("ACTIVE")
  transferEnabled   Boolean  @default(false)
  processorToken    String?
  lastSyncAt        DateTime?
}
```

**Transaction Model**:
```prisma
model Transaction {
  id                String   @id @default(cuid())
  investorId        String
  bankLinkId        String?
  type              String   // CAPITAL_CALL, DISTRIBUTION
  amount            Decimal  @db.Decimal(18, 2)
  currency          String   @default("USD")
  plaidTransferId   String?  @unique
  transferType      String?  // ach_debit, ach_credit
  status            String   @default("PENDING")
  ipAddress         String?
  userAgent         String?
  initiatedBy       String?  // userId of GP
  auditTrail        Json?
}
```

#### Dashboard Integration
- LP Dashboard shows bank connection status card
- "Connect Bank Account" CTA for unlinked investors
- Connected account details with institution name and masked account number
- "Manage" button to change connected account

#### Plaid Service Library (`lib/plaid.ts`)
| Function | Purpose |
|----------|---------|
| `createLinkToken()` | Generate Link token for bank connection UI |
| `exchangePublicToken()` | Exchange public token for access token |
| `getAccounts()` | Retrieve account details |
| `getInstitution()` | Get bank/institution info |
| `createTransferAuthorization()` | Authorize ACH transfer |
| `createTransfer()` | Execute ACH transfer |
| `getTransfer()` | Check transfer status |
| `cancelTransfer()` | Cancel pending transfer |
| `encryptToken()` | AES-256-GCM token encryption |
| `decryptToken()` | Token decryption |
| `verifyWebhookSignature()` | JWT signature verification |

#### Future Enhancements (Next Phase)
- **Capital Calls**: GP triggers ACH debit from connected accounts
- **Distributions**: Bulk ACH credits to investor bank accounts
- **Transaction Dashboard**: Admin view for all fund transactions

---

### 7. Upstash (Redis/Rate Limiting)

**Purpose**: Session storage, rate limiting, job queue

**Libraries**: `@upstash/redis`, `@upstash/ratelimit`

**Setup**:
1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy connection details

**Environment Variables**:
```
UPSTASH_REDIS_REST_URL=https://xxxxxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxx
```

---

## Setup Guide

### Prerequisites
- Node.js 22+
- PostgreSQL database
- Resend account (for emails)
- (Optional) Persona account (for KYC)

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/bf-fund-dataroom.git
cd bf-fund-dataroom
npm install
```

### 2. Database Setup

```bash
# Generate Prisma client
npx prisma generate --schema=./prisma/schema

# Push schema to database
npx prisma db push --schema=./prisma/schema

# (Optional) Open database GUI
npx prisma studio --schema=./prisma/schema
```

### 3. Environment Configuration

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random 32+ character string
- `RESEND_API_KEY` - From Resend dashboard

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

---

## Environment Variables

### Required (Core)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `POSTGRES_PRISMA_URL` | Yes | Prisma-specific PostgreSQL URL |
| `NEXTAUTH_SECRET` | Yes | Session encryption key (32+ chars) |
| `SESSION_SECRET` | Yes | Session signing key |
| `NEXTAUTH_URL` | Yes | Full app URL (e.g., https://your-domain.com) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Public-facing base URL |

### Email (Resend)

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Resend API key from [resend.com](https://resend.com) |

### Authentication (Google OAuth)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |

### KYC/AML (Persona)

| Variable | Required | Description |
|----------|----------|-------------|
| `PERSONA_API_KEY` | For KYC | API key from [withpersona.com](https://withpersona.com) |
| `PERSONA_TEMPLATE_ID` | For KYC | Inquiry template ID |
| `PERSONA_ENVIRONMENT_ID` | For KYC | Environment ID for embedded flow |
| `PERSONA_WEBHOOK_SECRET` | For KYC | Webhook signature verification secret |

### Storage (Replit Object Storage)

| Variable | Required | Description |
|----------|----------|-------------|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Yes | Replit storage bucket ID |
| `NEXT_PUBLIC_UPLOAD_TRANSPORT` | Yes | Upload method: `replit`, `s3`, or `vercel` |
| `PRIVATE_OBJECT_DIR` | Optional | Directory for private files |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob token (if using Vercel storage) |

### Security

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY` | Yes | Document encryption key |
| `NEXT_PRIVATE_VERIFICATION_SECRET` | Yes | OTP/verification token secret |
| `INTERNAL_API_KEY` | Optional | API key for internal service calls |

### AI (OpenAI)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | OpenAI API key for AI features |

### Payments - Plaid (Primary)

| Variable | Required | Description |
|----------|----------|-------------|
| `PLAID_CLIENT_ID` | For Payments | Plaid client ID from [dashboard.plaid.com](https://dashboard.plaid.com) |
| `PLAID_SECRET` | For Payments | Plaid secret key (sandbox/development/production) |
| `PLAID_ENV` | For Payments | Environment: `sandbox`, `development`, or `production` |
| `PLAID_WEBHOOK_URL` | For Payments | Webhook endpoint URL |

### Payments - Stripe (Optional/Future)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret |

### Caching (Upstash Redis)

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis REST token |

---

## API Reference

### LP Portal

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lp/me` | GET | Get investor profile, investments, KYC status |
| `/api/lp/docs` | GET | Get investor's signed documents from vault |
| `/api/lp/pending-signatures` | GET | Get documents awaiting signature |
| `/api/lp/complete-gate` | POST | Complete NDA/accreditation acknowledgment |
| `/api/lp/kyc` | GET | Get KYC verification status |
| `/api/lp/kyc` | POST | Start or resume Persona verification |

### E-Signature

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sign/[token]` | GET | Get document for signing |
| `/api/sign/[token]` | POST | Complete signature submission |
| `/api/sign/documents` | GET/POST | List/create signature documents |
| `/api/sign/documents/[id]` | GET/PATCH/DELETE | Manage specific document |
| `/api/sign/templates` | GET/POST | List/create signature templates |
| `/api/sign/templates/[id]` | GET/PATCH/DELETE | Manage specific template |

### Documents & Datarooms

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams/[teamId]/documents` | GET/POST | List/upload documents |
| `/api/teams/[teamId]/documents/[id]` | GET/PATCH/DELETE | Manage document |
| `/api/teams/[teamId]/datarooms` | GET/POST | List/create datarooms |
| `/api/teams/[teamId]/datarooms/[id]` | GET/PATCH/DELETE | Manage dataroom |
| `/api/teams/[teamId]/datarooms/[id]/folders` | GET/POST | Manage folders |

### Links & Access

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/links` | GET/POST | List/create sharing links |
| `/api/links/[id]` | GET/PATCH/DELETE | Manage specific link |
| `/api/links/[id]/viewers` | GET | Get link view history |

### Fund Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams/[teamId]/funds` | GET | List team's funds |
| `/api/funds/[fundId]/settings` | GET/PATCH | Get/update fund settings |
| `/api/funds/[fundId]/investors` | GET | List fund investors |

### Team Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams` | GET/POST | List/create teams |
| `/api/teams/[teamId]` | GET/PATCH | Get/update team |
| `/api/teams/[teamId]/members` | GET/POST | Manage team members |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/persona` | POST | Persona KYC status updates (requires signature) |
| `/api/stripe/webhook` | POST | Stripe payment events |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams/[teamId]/documents/[id]/stats` | GET | Document view statistics |
| `/api/links/[id]/stats` | GET | Link view statistics |

---

## Database Schema

### Core Models

```
User              - Admin/team member accounts
Team              - Organization/fund groups
Document          - Uploaded documents
Dataroom          - Document collections
Link              - Shareable access links
Viewer            - Document access sessions
```

### E-Signature Models

```
SignatureDocument  - Documents pending signature
SignatureRecipient - Signers/viewers per document
SignatureField     - Signature/date/text fields
SignatureTemplate  - Reusable document templates
SignatureAuditLog  - Complete audit trail
```

### LP Portal Models

```
Investor          - LP investor profiles
Fund              - Investment funds
Investment        - Investor-fund relationships
InvestorDocument  - Signed docs in vault
AccreditationAck  - Accreditation records
CapitalCall       - Capital call records
Distribution      - Distribution records
```

---

## Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage

# Specific suites
npm run test:sign      # E-signature tests
npm run test:auth      # Authentication tests
npm run test:datarooms # Gate logic tests
```

### Test Coverage

| Suite | Tests | Type |
|-------|-------|------|
| Sign Routes | 12 | E2E with handler calls |
| Auth Flows | 6 | Logic validation |
| Dataroom Gates | 15 | Gate rule logic |

---

## Deployment

### Replit Deployment

1. Click **Deploy** in the Replit interface
2. Configure production environment variables
3. Set custom domain if desired

### Production Checklist

- [ ] All secrets configured in production
- [ ] `NEXTAUTH_URL` set to production URL
- [ ] Persona webhook URL updated
- [ ] Email domain verified in Resend
- [ ] Google OAuth redirect URI updated

---

## Support

For issues or questions, contact the development team or open a GitHub issue.

**License**: Private - All Rights Reserved
