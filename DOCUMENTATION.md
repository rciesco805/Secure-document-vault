# BF Fund Investor Dataroom - Complete Documentation

A comprehensive 506(c) fund GP/LP management suite for private fund managers (General Partners) to manage investor relationships, secure document sharing, e-signatures, onboarding, KYC/AML verification, and bank account linking for capital calls and distributions.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Features](#features)
3. [User Journeys](#user-journeys)
4. [Technology Stack](#technology-stack)
5. [Third-Party Integrations](#third-party-integrations)
6. [Setup Guide](#setup-guide)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Security & Compliance](#security--compliance)

---

## Platform Overview

### What is BF Fund Investor Dataroom?

The BF Fund Investor Dataroom is a **self-hosted, enterprise-grade investor portal** designed specifically for private fund managers (GPs) running SEC 506(c) exempt offerings. It provides a complete end-to-end solution for:

- **Investor Onboarding** - Guided multi-step onboarding with entity selection and magic link verification
- **Document Management** - Secure datarooms with folder organization, custom branding, and page-level analytics
- **E-Signatures** - Self-hosted DocuSign-style signing platform with no external dependencies
- **Compliance** - SEC 506(c) audit trails, accreditation verification, and KYC/AML verification
- **Capital Management** - Bank account linking via Plaid for ACH capital calls and distributions

### Why Self-Hosted?

| Benefit | Description |
|---------|-------------|
| **Data Sovereignty** | All investor data, documents, and signatures remain on your infrastructure |
| **No Per-Signature Fees** | Unlimited e-signatures without DocuSign/HelloSign costs |
| **Full Customization** | White-label branding, custom domains, tailored investor experience |
| **Compliance Control** | Complete audit trails and data retention under your control |
| **Integration Flexibility** | Connect to your existing CRM, accounting, and fund admin systems |

### Target Users

| User Type | Description | Primary Pages |
|-----------|-------------|---------------|
| **General Partner (GP)** | Fund manager/admin who manages investors, documents, and compliance | `/dashboard`, `/settings/*`, `/sign/*` |
| **Limited Partner (LP)** | Investor who onboards, signs documents, and tracks investments | `/lp/dashboard`, `/lp/docs`, `/lp/bank-connect` |
| **Team Member** | Staff with role-based access (Admin, Manager, Member) | `/dashboard`, `/documents/*` |

### Core Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Investor Dataroom** | ✅ Complete | Secure document sharing with folder organization, custom branding, page-level analytics, and magic link access |
| **BF Fund Sign** | ✅ Complete | Self-hosted e-signature platform with drag-and-drop fields, multi-recipient workflows, templates, bulk sending, QR signing, and audit trails |
| **LP Fundroom Portal** | ✅ Complete | Personalized investor dashboards with 3-step onboarding, document vault, pending signatures, fund progress, and GP messaging |
| **NDA/Accreditation Gate** | ✅ Complete | Optional per-fund investor gate with 506(c) compliance logging and accreditation wizard |
| **KYC/AML Verification** | ✅ Complete | Post-subscription identity verification using Persona API with embedded popup flow |
| **Bank Connect (Plaid)** | ✅ Complete | One-click bank account linking for ACH capital calls and distributions |
| **Error Monitoring** | ✅ Complete | Real-time error tracking with Rollbar for client and server-side errors |
| **Capital Calls** | 🔄 Next Phase | GP-initiated ACH debits from investor bank accounts |
| **Distributions** | 🔄 Next Phase | Bulk ACH credits to investor bank accounts |
| **K-1 Management** | 📋 Planned | Tax document generation and distribution |

---

## Features

### 1. Investor Dataroom

Secure document sharing platform for private placement memorandums, subscription agreements, and investor communications.

#### Core Capabilities

| Feature | Description | Location |
|---------|-------------|----------|
| **Secure Upload** | Drag-and-drop PDF/document uploads with encryption at rest | `/documents` |
| **Folder Hierarchy** | Unlimited nested folder structures for organization | `/datarooms/[id]/folders` |
| **Custom Branding** | White-label with fund logo, colors, and custom CSS | `/settings/general` |
| **Page-Level Analytics** | Track exactly which pages each investor views and for how long | `/documents/[id]/stats` |
| **Magic Link Access** | One-click email verification without passwords | Automatic via email |
| **Custom Domain** | Host on your own domain (e.g., investors.yourfund.com) | `/settings/domains` |
| **Watermarking** | Dynamic watermarks with investor email/timestamp | Document settings |
| **Download Controls** | Enable/disable downloads per document or dataroom | Link settings |
| **Expiration** | Auto-expire access links after specified date | Link settings |

#### Access Control

| Permission Level | Description |
|-----------------|-------------|
| **Public Link** | Anyone with the link can view (not recommended for confidential docs) |
| **Email Verification** | Viewers must verify email before access |
| **Password Protected** | Additional password required |
| **Allow List** | Only specific email addresses can access |
| **NDA Required** | Must accept NDA before viewing |
| **Accreditation Required** | Must complete accreditation wizard |

### 2. BF Fund Sign (E-Signature Platform)

**Self-hosted, DocuSign-style e-signature platform** with no external dependencies or per-signature fees.

#### Field Types

| Field | Description | Validation |
|-------|-------------|------------|
| **Signature** | Draw, type, or upload signature | Required |
| **Initials** | Short signature for page acknowledgment | Required |
| **Date** | Auto-populated or manual date selection | Auto-fill available |
| **Text** | Free-form text input | Optional validation |
| **Checkbox** | Agreement/acknowledgment checkboxes | Optional required |
| **Dropdown** | Pre-defined selection options | Configurable |

#### Recipient Roles

| Role | Description | Actions |
|------|-------------|---------|
| **Signer** | Must complete all assigned fields | Sign, initial, fill fields |
| **Viewer** | Receives copy for records only | View, download |
| **Approver** | Reviews before or after signing | Approve/reject |
| **Carbon Copy** | Receives final signed copy | View only |

#### Workflow Features

| Feature | Description |
|---------|-------------|
| **Sequential Signing** | Recipients sign in specified order |
| **Parallel Signing** | All recipients can sign simultaneously |
| **Bulk Sending** | Send same document to multiple recipients at once |
| **Reusable Templates** | Save document configurations for repeated use |
| **QR Code Signing** | In-person signing via mobile phone QR scan |
| **Document Expiration** | Auto-void documents after deadline |
| **Correct & Resend** | Fix errors and resend without starting over |
| **Reminder Emails** | Automatic reminders for pending signatures |

#### Audit Trail

Every signature action is logged with:
- Timestamp (UTC)
- IP address
- User agent (browser/device)
- Geolocation (derived from IP)
- Action type (viewed, signed, declined, etc.)
- Session ID

#### PDF Integration

| Feature | Technology |
|---------|------------|
| **Field Placement** | Drag-and-drop on PDF pages using react-pdf |
| **Signature Embedding** | pdf-lib for embedding signatures directly into PDF |
| **Visual Rendering** | MuPDF for high-quality page rendering |
| **Certificate Stamping** | Signing certificate with timestamp and verification link |

### 3. LP Fundroom Portal

**Personalized investor dashboard** providing a complete self-service experience for Limited Partners.

#### Investor Onboarding (`/lp/onboard`)

| Step | Description | Fields |
|------|-------------|--------|
| **Step 1** | Basic Information | Full name, email address |
| **Step 2** | Entity Selection | Individual, LLC, Trust, Corporation, Partnership |
| **Step 3** | Magic Link Verification | Email verification with one-click login |

#### Dashboard Features (`/lp/dashboard`)

| Section | Description | Data Source |
|---------|-------------|-------------|
| **Welcome Banner** | Personalized greeting with investor name | Investor profile |
| **Fund Progress** | Visual fundraise progress with percentage and amounts | Fund model |
| **Your Commitment** | Total commitment amount across all funds | Investment model |
| **Signed Documents** | Count of completed signatures with NDA status | InvestorDocument model |
| **Accreditation Status** | Verified/Self-Certified status badge | Investor model |
| **Pending Signatures** | Action Required cards with "Sign Now" buttons | SignatureRecipient model |
| **KYC Status** | Verification progress with "Verify Identity" CTA | Persona integration |
| **Bank Connect** | Bank account status with "Connect Bank" CTA | BankLink model |
| **Capital Calls** | Outstanding capital call notices with due dates | CapitalCall model |
| **Message GP** | Direct communication form to fund manager | InvestorNote model |

#### Document Vault (`/lp/docs`)

| Feature | Description |
|---------|-------------|
| **All Signed Documents** | Complete history of signed documents with download |
| **Document Types** | Subscription Agreement, NDA, Side Letter, etc. |
| **Signed Date** | Timestamp when document was completed |
| **View/Download** | Generate signed URLs for secure access |
| **Search** | Filter documents by title or type |

#### Bank Connect (`/lp/bank-connect`)

| Feature | Description |
|---------|-------------|
| **Plaid Link Integration** | Secure bank connection via Plaid's UI |
| **Institution Display** | Shows bank name with account masked (••••1234) |
| **Account Type** | Checking/Savings account identification |
| **Change Account** | Option to connect different bank account |
| **Transfer Ready** | Account verified for ACH debits/credits |

### 4. NDA/Accreditation Gate

Optional **per-fund investor gate** requiring NDA acceptance and accreditation acknowledgment before accessing fund materials.

#### Gate Configuration

| Setting | Description | Location |
|---------|-------------|----------|
| **Enable/Disable** | Toggle gate on or off per fund | `/settings/funds` |
| **NDA Text** | Customizable NDA language | Fund settings |
| **Accreditation Types** | Individual, Entity, Qualified Purchaser | Wizard options |

#### 506(c) Compliance Logging

Every gate completion captures:
- IP address
- User agent
- Timestamp
- Session ID
- Geolocation
- Selected accreditation type
- All acknowledgment checkboxes

#### Accreditation Wizard Steps

| Step | Description | Fields |
|------|-------------|--------|
| **Step 1** | Accreditation Type Selection | Individual Income, Net Worth, Professional, Entity |
| **Step 2** | Acknowledgment Checkboxes | "I confirm I am accredited", "I understand the risks", "I have reviewed documents", "My representations are accurate" |
| **Step 3** | NDA Acceptance | Read and accept NDA terms |

### 5. KYC/AML Verification

**Post-subscription identity verification** using Persona API for SEC 506(c) "reasonable steps" compliance.

#### Verification Flow

| Step | Description | UI |
|------|-------------|-----|
| **1. Trigger** | After subscription document is signed | Automatic |
| **2. Prompt** | Dashboard shows "Verify Identity" card | `/lp/dashboard` |
| **3. Launch** | Embedded Persona popup (500x700px) | Modal overlay |
| **4. Capture** | ID photo + selfie verification | Persona UI |
| **5. Processing** | AI verification by Persona | Background |
| **6. Webhook** | Status update received | `/api/webhooks/persona` |
| **7. Display** | Status shown on dashboard | Real-time update |

#### Verification Statuses

| Status | Description | Dashboard Display |
|--------|-------------|-------------------|
| **NOT_STARTED** | Verification not initiated | "Verify Identity" button |
| **PENDING** | Verification in progress | "Verification Pending" badge |
| **APPROVED** | Identity verified successfully | Green "Verified" badge |
| **DECLINED** | Verification failed | "Verification Failed" with retry |
| **NEEDS_REVIEW** | Manual review required | "Under Review" badge |
| **EXPIRED** | Verification expired (>1 year) | "Re-verify" button |

### 6. Admin Tools

#### Fund Settings (`/settings/funds`)

| Feature | Description |
|---------|-------------|
| **Fund List** | All funds for current team with status |
| **Investor Count** | Number of investors per fund |
| **NDA Gate Toggle** | Enable/disable per fund |
| **Fund Status** | RAISING, CLOSED, ACTIVE |

#### Signature Audit (`/settings/signature-audit`)

| Filter | Description |
|--------|-------------|
| **Date Range** | Filter by signing date |
| **Document** | Filter by specific document |
| **Signer** | Filter by signer email |
| **Status** | Completed, Pending, Declined, Voided |
| **Export** | Download audit log as CSV |

#### Template Manager (`/settings/sign`)

| Feature | Description |
|---------|-------------|
| **Create Template** | Upload PDF and place fields |
| **Recipient Roles** | Define signer/viewer roles |
| **Field Mapping** | Map fields to recipient roles |
| **Use Template** | Generate new document from template |

---

## User Journeys

### GP (Fund Manager) Journey

```
1. Sign Up / Login
   └── Email magic link or Google OAuth
   └── Redirects to Hub (/hub) for navigation

2. Hub Navigation (/hub)
   ├── Choose Dataroom (document management)
   └── Choose Fundroom (investor management) - if access granted

3. Team Setup
   ├── Create team/fund
   ├── Configure branding
   ├── Invite team members
   └── Toggle Fundroom access per member (Settings > People)

4. Document Management (Dataroom)
   ├── Upload PPM, subscription docs, NDAs
   ├── Create dataroom with folders
   └── Configure access controls

5. E-Signature Setup
   ├── Create signature templates
   ├── Place fields on documents
   └── Set recipient roles

6. Investor Onboarding
   ├── Send dataroom links
   ├── Monitor document access
   └── Send signature requests

7. Fundroom Management (/admin/fund)
   ├── View fund overview and metrics
   ├── Track subscriptions and commitments
   └── Manage investor relationships

8. Compliance Monitoring
   ├── Track accreditation status
   ├── Monitor KYC verification
   └── Export audit logs

9. Capital Management (Coming Soon)
   ├── Issue capital calls
   ├── Track payments
   └── Process distributions
```

### LP (Investor) Journey

```
1. Receive Invitation
   └── Email with dataroom link

2. Onboarding (/lp/onboard)
   ├── Enter name and email
   ├── Select entity type
   └── Verify via magic link

3. NDA/Accreditation Gate (if enabled)
   ├── Read and accept NDA
   ├── Complete accreditation wizard
   └── Confirm acknowledgments

4. Access Fundroom Dashboard (/lp/dashboard)
   ├── View personalized fund overview
   ├── Track investment progress
   ├── Access signed documents vault
   └── Navigate to Dataroom via "View Dataroom" link

5. Review Documents in Dataroom
   ├── Access dataroom (linked from Fundroom)
   ├── View PPM, financial docs
   ├── Download materials
   └── Return to Fundroom via "My Fundroom" button

6. Sign Documents (/sign/[token])
   ├── Review document
   ├── Complete all fields
   └── Submit signature

7. Identity Verification (if required)
   ├── Launch Persona popup
   ├── Upload ID and selfie
   └── Await verification

7. Bank Connection (/lp/bank-connect)
   ├── Launch Plaid Link
   ├── Select bank and account
   └── Confirm connection

8. Ongoing Access (/lp/dashboard)
   ├── View investment status
   ├── Access signed documents
   ├── Track capital calls
   └── Message GP
```

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
| `PERSONA_ENVIRONMENT` | For KYC | Environment: `sandbox` (default) or `production` |
| `PERSONA_WEBHOOK_SECRET` | For KYC | Webhook signature verification secret |

### Storage (Multi-Provider)

The platform supports multiple storage backends for deployment flexibility:

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_PROVIDER` | No | Storage backend: `replit`, `s3`, `r2`, or `local` (default: replit) |
| `STORAGE_BUCKET` | For S3/R2 | S3 or R2 bucket name |
| `STORAGE_REGION` | For S3 | AWS region (default: us-east-1) |
| `STORAGE_ENDPOINT` | For R2/MinIO | Custom S3-compatible endpoint URL |
| `STORAGE_ACCESS_KEY_ID` | For S3/R2 | AWS access key ID |
| `STORAGE_SECRET_ACCESS_KEY` | For S3/R2 | AWS secret access key |
| `STORAGE_LOCAL_PATH` | For local | Local filesystem path (default: ./.storage) |
| `STORAGE_ENCRYPTION_KEY` | Recommended | AES-256 encryption key (64-character hex string) |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | For Replit | Replit storage bucket ID |
| `PRIVATE_OBJECT_DIR` | For Replit | Directory for private files |
| `BLOB_READ_WRITE_TOKEN` | For Vercel | Vercel Blob token (if using Vercel storage) |

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

| Model | Description | Key Fields |
|-------|-------------|------------|
| **User** | Admin/team member accounts | id, name, email, role, emailVerified |
| **Team** | Organization/fund groups | id, name, slug, plan, brandingSettings |
| **TeamMember** | User-team relationships | userId, teamId, role (ADMIN/MANAGER/MEMBER) |
| **Document** | Uploaded documents | id, name, teamId, storageType, file, numPages |
| **Dataroom** | Document collections | id, name, teamId, pId (parent), folders |
| **DataroomFolder** | Folder hierarchy | id, name, dataroomId, parentId, path |
| **Link** | Shareable access links | id, documentId, url, password, expiresAt, allowDownload |
| **Viewer** | Document access sessions | id, linkId, email, verified, viewedAt |
| **View** | Individual page views | id, viewerId, documentId, pageNumber, duration |

### E-Signature Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| **SignatureDocument** | Documents pending signature | id, teamId, name, file, status, expiresAt |
| **SignatureRecipient** | Signers/viewers per document | id, documentId, email, role, order, status, signingToken |
| **SignatureField** | Signature/date/text fields | id, documentId, recipientId, type, page, x, y, width, height, value |
| **SignatureTemplate** | Reusable document templates | id, teamId, name, file, fields, recipients |
| **SignatureAuditLog** | Complete audit trail | id, documentId, action, actorEmail, ipAddress, userAgent, timestamp |

### LP Portal Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Investor** | LP investor profiles | id, userId, entityName, entityType, accreditationStatus, personaStatus, ndaSigned |
| **Fund** | Investment funds | id, teamId, name, targetRaise, currentRaise, status, ndaGateEnabled |
| **Investment** | Investor-fund relationships | id, fundId, investorId, commitmentAmount, fundedAmount, status |
| **InvestorDocument** | Signed docs in vault | id, investorId, title, documentType, storageKey, signedAt |
| **AccreditationAck** | Accreditation records | id, investorId, accreditationType, acknowledged, ipAddress, userAgent, completedAt |
| **CapitalCall** | Capital call records | id, fundId, callNumber, amount, dueDate, status |
| **CapitalCallResponse** | Investor responses to calls | id, capitalCallId, investorId, amountDue, amountPaid, status |
| **Distribution** | Distribution records | id, fundId, distributionNumber, totalAmount, distributionType, status |
| **InvestorNote** | GP-LP messages | id, investorId, teamId, content, isFromInvestor |

### Bank Connect Models (Plaid)

| Model | Description | Key Fields |
|-------|-------------|------------|
| **BankLink** | Connected bank accounts | id, investorId, plaidItemId, plaidAccessToken (encrypted), plaidAccountId, institutionName, accountMask, status, transferEnabled |
| **Transaction** | Capital calls/distributions | id, investorId, bankLinkId, type, amount, plaidTransferId, status, ipAddress, auditTrail |

### Entity Relationships

```
User ─────────────┬──────────────── TeamMember ──────────────── Team
                  │                                              │
                  └──── Investor                                 │
                        │                                        │
                        ├─── BankLink                            │
                        │    └─── Transaction                    │
                        │                                        │
                        ├─── Investment ──────────────────────── Fund
                        │                                        │
                        ├─── InvestorDocument                    │
                        │                                        │
                        ├─── AccreditationAck                    │
                        │                                        │
                        └─── CapitalCallResponse                 │
                                                                 │
Team ────────────────────────────────────────────────────────────┘
  │
  ├─── Document ──────── Link ──────── Viewer ──────── View
  │
  ├─── Dataroom ──────── DataroomFolder
  │
  ├─── SignatureDocument ──┬── SignatureRecipient
  │                        │
  │                        ├── SignatureField
  │                        │
  │                        └── SignatureAuditLog
  │
  └─── SignatureTemplate
```

---

## Testing

### Sandbox & Development Configuration

For local development and testing, external services can be configured in sandbox mode. See the full guide: **[docs/SANDBOX_TESTING.md](docs/SANDBOX_TESTING.md)**

**Quick Setup:**
```bash
# Essential sandbox settings
PLAID_ENV=sandbox
PERSONA_ENVIRONMENT=sandbox
STORAGE_PROVIDER=local
```

| Service | Sandbox Variable | Dashboard |
|---------|------------------|-----------|
| Plaid | `PLAID_ENV=sandbox` | [dashboard.plaid.com](https://dashboard.plaid.com) |
| Persona | `PERSONA_ENVIRONMENT=sandbox` | [withpersona.com](https://withpersona.com) |
| Stripe | Use `sk_test_*` keys | [dashboard.stripe.com](https://dashboard.stripe.com) |
| Storage | `STORAGE_PROVIDER=local` | N/A |

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

## Security & Compliance

### SEC 506(c) Compliance

The platform is designed specifically to support SEC Regulation D Rule 506(c) offerings, which require the issuer to take "reasonable steps" to verify accredited investor status.

#### Reasonable Steps Documentation

| Requirement | Platform Feature |
|-------------|-----------------|
| **Investor Self-Certification** | Accreditation wizard with checkbox acknowledgments |
| **Type Selection** | Income, Net Worth, Professional, Entity options |
| **Audit Trail** | IP address, user agent, timestamp, session ID logging |
| **KYC/AML Verification** | Persona integration for identity verification |
| **Document Retention** | All signed documents stored with audit trails |

#### Compliance Logging

Every investor action is logged:
- Dataroom access with page views
- Document downloads
- Signature events
- NDA/accreditation acknowledgments
- KYC verification status changes

### Data Security

#### Encryption

| Data Type | Encryption Method |
|-----------|------------------|
| **Documents at Rest** | AES-256-GCM via unified storage provider (Replit, S3, R2, or local) |
| **Plaid Access Tokens** | AES-256-GCM with per-token IV and auth tag |
| **Sessions** | Encrypted cookies with NEXTAUTH_SECRET |
| **Passwords** | bcrypt hashing with salt |

#### Access Controls

| Control | Implementation |
|---------|----------------|
| **Authentication** | Email magic links + optional Google OAuth |
| **Authorization** | Role-based (ADMIN, MANAGER, MEMBER) |
| **Session Management** | NextAuth.js with Prisma adapter |
| **API Protection** | Server-side session validation on all endpoints |

#### Unified Admin Access Control (Hub System)

| User Type | After Login Redirect | Access |
|-----------|---------------------|--------|
| **Team Member (ADMIN role)** | `/hub` | Full Dataroom + Fundroom access |
| **Team Member (MANAGER/MEMBER)** | `/hub` | Dataroom always; Fundroom if `hasFundroomAccess=true` |
| **LP Investor** | `/lp/dashboard` | Personal fund dashboard + Dataroom navigation |
| **Dataroom Viewer** | Assigned dataroom link | Dataroom only |

**Key Fields:**
- `UserTeam.hasFundroomAccess` - Controls Fundroom access for non-ADMIN team members
- `Investor.userId` - Links user to LP dashboard

**Cross-Navigation:**
- LP Dashboard → Dataroom: "View Dataroom" link in header
- Dataroom → LP Dashboard: "My Fundroom" button (shown only to authenticated investors)

#### Webhook Security

| Integration | Verification Method |
|-------------|---------------------|
| **Persona** | HMAC signature verification |
| **Plaid** | JWT signature verification with jose library |
| **Stripe** | Webhook signing secret verification |

### Production Security Checklist

- [ ] All secrets configured in Replit Secrets (never in code)
- [ ] `NEXTAUTH_SECRET` is 32+ random characters
- [ ] `PLAID_TOKEN_ENCRYPTION_KEY` set (required in production)
- [ ] Persona webhook secret configured
- [ ] Google OAuth redirect URIs updated for production domain
- [ ] Custom domain with SSL configured
- [ ] Rate limiting enabled via Upstash Redis
- [ ] Database backups enabled

### Data Retention

| Data Type | Retention Policy |
|-----------|------------------|
| **Signed Documents** | Permanent (required for compliance) |
| **Audit Logs** | 7 years minimum (SEC requirement) |
| **Investor Profiles** | Until fund dissolution + 7 years |
| **Session Data** | 30 days |
| **Page View Analytics** | 2 years |

---

## Cache Management & Auto-Updates

The platform uses a **zero-cache-clearing** update system. Visitors automatically receive the latest version without any manual intervention.

### How It Works

| Component | Strategy | Purpose |
|-----------|----------|---------|
| **Service Worker** | Versioned (`v2-2026-01-25`) | Triggers cache invalidation on deploy |
| **HTML Pages** | `no-cache, no-store` | Always fetches fresh content |
| **sw.js** | Never cached | Ensures updates are immediate |
| **manifest.json** | 1-hour cache | Picks up app icon/name changes |
| **Static Assets** | Network-first | Caches for offline, updates on load |

### Automatic Update Flow

1. User visits site after deploy
2. Browser detects new service worker version
3. Old caches (`bf-fund-v1`, etc.) automatically deleted
4. New service worker activates with `skipWaiting()`
5. Page auto-refreshes via `controllerchange` event
6. User sees latest version - no manual refresh needed

### Key Files

| File | Purpose |
|------|---------|
| `public/sw.js` | Service worker with versioned cache names |
| `components/pwa-install.tsx` | Auto-update detection and page refresh |
| `next.config.mjs` | HTTP cache headers for all routes |

### Cache Version Updates

When deploying updates, increment the version in `public/sw.js`:

```javascript
const CACHE_VERSION = 'v2-2026-01-25';  // Update this on each deploy
```

This ensures all visitors get fresh content without 404 errors from stale cached routes.

---

## Changelog

### January 28, 2026

**Schema & Type Alignment:**
- Added `OWNER` role to Prisma Role enum for enhanced permission management
- Created `types/next-auth.d.ts` for proper `session.user.id` typing in TypeScript
- Aligned test files with current Prisma schema:
  - Renamed `auditLog` → `signatureAuditLog` throughout tests
  - Updated SignatureDocument fields: `name` → `title`, `fileUrl` → `file`
  - Updated SignatureRecipient fields: `signedIp` → `ipAddress`
  - Fixed enum values: `voidReason` → `voidedReason`, status `PENDING` → `SENT`
  - Aligned investor fields: `kycStatus` → `personaStatus`

**Build & TypeScript:**
- Reduced total TypeScript errors from 183 to 107 (41% reduction)
- Production file errors: 59 (build continues with `ignoreBuildErrors: true`)
- Test file errors: 48 (primarily in `phase1-visitor-dataroom.test.ts`)

---

## Support

For issues or questions, contact the development team or open a GitHub issue.

**License**: Private - All Rights Reserved
