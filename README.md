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

- [Next.js 16](https://nextjs.org/) – Framework (Hybrid Pages/App Router)
- [React 19](https://react.dev/) – UI Library
- [TypeScript](https://www.typescriptlang.org/) – Language
- [Tailwind CSS](https://tailwindcss.com/) – Styling
- [shadcn/ui](https://ui.shadcn.com) – UI Components
- [Prisma](https://prisma.io) – ORM [![Made with Prisma](https://made-with.prisma.io/dark.svg)](https://prisma.io)
- [PostgreSQL](https://www.postgresql.org/) – Database
- [NextAuth.js](https://next-auth.js.org/) – Authentication
- [Tinybird](https://tinybird.co) – Real-time Analytics
- [Resend](https://resend.com) – Transactional Email
- [Persona](https://withpersona.com) – KYC/AML Verification
- [Plaid](https://plaid.com) – Bank Connectivity
- [Stripe](https://stripe.com) – Platform Billing
- [Rollbar](https://rollbar.com) – Error Monitoring
- **Multi-Provider Storage** – Replit Object Storage, AWS S3, Cloudflare R2, or local filesystem

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
# Core
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...

# Email
RESEND_API_KEY=...

# KYC/AML (sandbox mode available)
PERSONA_API_KEY=...
PERSONA_ENVIRONMENT=sandbox  # sandbox or production

# Bank Connectivity (sandbox mode available)
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox  # sandbox, development, or production

# Payments
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...

# Analytics
TINYBIRD_TOKEN=...

# Error Monitoring
ROLLBAR_SERVER_TOKEN=...
NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN=...
```

For complete environment setup, see [.env.example](.env.example) and [docs/SANDBOX_TESTING.md](docs/SANDBOX_TESTING.md).

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
- **1599+ passing tests** across all phases
- Phase 1: LP/Visitor dataroom access, onboarding, subscriptions
- Phase 2: Admin/GP dashboard, bulk actions, fund management
- Phase 3: Cross-side interactions, edge cases, compliance stress tests

### Sandbox & Development Testing

For development without production API keys:

```bash
PLAID_ENV=sandbox
PERSONA_ENVIRONMENT=sandbox
STORAGE_PROVIDER=local
```

See [docs/SANDBOX_TESTING.md](docs/SANDBOX_TESTING.md) for complete sandbox configuration including test credentials and webhook simulation.

## Database Schema

The Prisma schema is located at `prisma/schema.prisma` with **85+ models** organized by domain:

- **Core**: User, Team, Account, Session, Brand, Domain
- **LP Portal**: Investor, Fund, Investment, CapitalCall, Distribution, Transaction
- **Documents**: Document, DocumentVersion, DocumentPage, Folder
- **Datarooms**: Dataroom, DataroomDocument, DataroomFolder, DataroomBrand
- **Access Control**: Link, Viewer, ViewerGroup, PermissionGroup, AccessRequest
- **E-Signatures**: SignatureDocument, SignatureRecipient, SignatureField, SignatureTemplate, SignatureAuditLog
- **Compliance**: AuditLog, AccreditationAck
- **Banking**: BankLink, Transaction

For complete database setup, migrations, and seeding guide, see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

## Roadmap

### Phase 1 (MVP) - Complete
- Core LP onboarding with NDA gate
- Accredited investor self-certification wizard
- Fundroom dashboard with investment tracking
- Self-hosted e-signature (BF Fund Sign)
- Dual threshold system (Initial Closing vs Full Authorized)
- Form D compliance tracking
- Multi-provider storage abstraction (Replit, S3, R2, local)
- Error monitoring with Rollbar

### Phase 2 - In Progress
- Plaid-powered ACH transfers with webhook-driven compliance logging
- Bulk capital call and distribution wizards
- Advanced analytics and AUM reporting with fee deductions
- Entity fee/tier configuration (management fees, carried interest, hurdle rates)
- Real-time wizard progress tracking
- Mobile viewport optimization

### Phase 3 - Planned
- STARTUP mode (cap table management)
- Vesting schedules and equity grants
- Share class management
- Secondary transfer tracking

## Deployment

### Replit (Recommended)
This project is optimized for Replit deployment with built-in database, secrets management, and object storage.

### Vercel / Docker / VPS
The platform includes a unified storage abstraction layer supporting multiple backends:

```bash
# Storage Provider Configuration
STORAGE_PROVIDER=s3|r2|local     # Storage backend (default: replit)
STORAGE_BUCKET=my-bucket          # S3/R2 bucket name
STORAGE_REGION=us-east-1          # AWS region
STORAGE_ENDPOINT=https://...      # Custom endpoint (for R2/MinIO)
STORAGE_ACCESS_KEY_ID=xxx         # AWS access key
STORAGE_SECRET_ACCESS_KEY=xxx     # AWS secret key
STORAGE_ENCRYPTION_KEY=xxx        # AES-256 key (64-char hex)
```

### Docker
```bash
# Build image
docker build -t bf-fund-dataroom .

# Run container
docker run -p 3000:3000 --env-file .env bf-fund-dataroom
```

## Architecture

```
├── pages/                    # Next.js Pages Router
│   ├── api/                  # API routes
│   │   ├── admin/           # GP/Admin endpoints
│   │   ├── lp/              # LP Portal endpoints
│   │   ├── webhooks/        # Plaid webhooks
│   │   └── auth/            # NextAuth configuration
│   ├── admin/               # Admin UI pages
│   ├── dataroom/            # Dataroom viewer
│   └── lp/                  # LP Portal pages
├── app/                      # Next.js App Router (auth, admin)
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   ├── lp/                  # LP-specific components
│   └── signature/           # E-signature components
├── lib/                      # Shared utilities
│   ├── auth/                # Auth helpers
│   ├── audit/               # Compliance logging
│   └── prisma.ts            # Database client
├── prisma/schema/            # Multi-file Prisma schema
└── __tests__/               # E2E and unit tests
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the AGPL-3.0 License.
