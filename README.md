# BF Fund Investor Dataroom

A comprehensive 506(c) fund GP/LP management suite designed to streamline investor relations and compliance. Built for fund managers who need secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification.

## Features

### Core Platform
- **Shareable Links:** Share your documents securely by sending a custom link
- **Custom Branding:** Add a custom domain and your own branding
- **Analytics:** Gain insights through document tracking and page-by-page analytics
- **Self-hosted, Open-source:** Host it yourself and customize it as needed

### LP Fundroom Portal
Personalized investor experience with comprehensive fund management:

- **Unique Fundroom Dashboard:** Each LP gets a personalized dashboard showing their investments, commitments, distributions, and capital calls with real-time updates
- **3-Step Onboarding:** Guided flow from account creation through NDA signature to accreditation verification
- **Subscription Modal:** Unit-based pricing with multi-tier blended pricing, Review→Sign flow, and server-side amount validation
- **Per-LP Document Vault:** Secure storage for signed subscription agreements, K-1s, and investor-specific documents
- **Bank Account Linking:** Plaid integration for ACH capital calls and distributions
- **Real-time Updates:** 30-second auto-refresh polling with manual refresh buttons

### E-Signature (BF Fund Sign)
Fully self-hosted e-signature solution with no external dependencies:

- Custom React drag-and-drop field placement
- Multi-recipient workflows (Signer, Viewer, Approver)
- Sequential signing with configurable order
- Bulk sending and reusable templates
- Detailed audit trails with embedded PDF signatures using pdf-lib

### Admin/GP Dashboard
Comprehensive fund management tools:

- Fund settings with NDA gate toggling
- Financial aggregates (Total Raised, Distributed, Commitments)
- Recharts visualizations
- Bulk action wizard for capital calls and distributions
- Dual Threshold System: Initial Closing Threshold vs Full Authorized Amount
- Form D compliance tracking with amendment reminders
- Entity Mode toggle (FUND vs STARTUP) for Phase 3 expansion

## 506(c) Compliance

This platform is designed for SEC Rule 506(c) compliant private offerings:

### Accredited Investor Verification
- **Self-Certification Wizard:** 4-checkbox accreditation flow with SEC-compliant criteria
- **KYC/AML Verification:** Persona API integration (iframe embed, post-NDA/pre-subscription)
- **Comprehensive Audit Trail:** Every investor action is logged with timestamps, IP addresses, and user agents

### Compliance Features
- Form D filing date tracking and annual amendment reminders
- State notice requirements tracking
- View audit logging with IP address, geolocation, device info, and session tracking
- Accreditation status tracking (PENDING, VERIFIED, SELF_CERTIFIED, EXPIRED)

### Investor Onboarding Flow
1. Dataroom access (optional NDA gate)
2. Account creation
3. NDA signature (if enabled)
4. Accreditation self-certification (4-checkbox wizard)
5. Persona KYC/AML verification (iframe embed)
6. Fundroom dashboard access
7. Subscription/investment

## Tech Stack

- [Next.js](https://nextjs.org/) – Framework (Hybrid Pages/App Router)
- [TypeScript](https://www.typescriptlang.org/) – Language
- [Tailwind](https://tailwindcss.com/) – CSS
- [shadcn/ui](https://ui.shadcn.com) - UI Components
- [Prisma](https://prisma.io) - ORM [![Made with Prisma](https://made-with.prisma.io/dark.svg)](https://prisma.io)
- [PostgreSQL](https://www.postgresql.org/) - Database
- [NextAuth.js](https://next-auth.js.org/) – Authentication
- [Tinybird](https://tinybird.co) – Real-time Analytics
- [Resend](https://resend.com) – Transactional Email
- [Persona](https://withpersona.com) – KYC/AML Verification
- [Plaid](https://plaid.com) – Bank Connectivity
- [Stripe](https://stripe.com) – Platform Billing
- [Replit Object Storage](https://replit.com) – Document Storage

## Payment Architecture

| Service | Purpose | Flow |
|---------|---------|------|
| **Plaid** | Large ACH transfers | Capital calls (LP → Fund), Distributions (Fund → LP) |
| **Stripe** | Platform billing | Subscription fees (not capital movements) |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Required API keys (see Environment Variables)

### Installation

```bash
# Install dependencies
npm install

# Set up database
npx prisma db push

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
RESEND_API_KEY=...
PERSONA_API_KEY=...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
TINYBIRD_TOKEN=...
```

## Testing

The project includes comprehensive E2E tests covering all phases:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern="phase1"
```

### Test Coverage
- **1205 passing tests** across all phases
- Phase 1: LP/Visitor dataroom access, onboarding, subscriptions
- Phase 2: Admin/GP dashboard, bulk actions, fund management
- Phase 3: Cross-side interactions, edge cases, compliance stress tests

## Database Schema

The Prisma schema is organized into multiple files in `prisma/schema/`:

- `schema.prisma` - Core models (User, Team, Account, Session)
- `investor.prisma` - LP Portal models (Investor, Fund, Investment, CapitalCall, Distribution)
- `document.prisma` - Document management
- `dataroom.prisma` - Dataroom access and sharing
- `signature.prisma` - E-signature workflows
- `entity.prisma` - Entity mode configuration (FUND/STARTUP)

## License

This project is licensed under the AGPL-3.0 License.
