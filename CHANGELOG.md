# Changelog

All notable changes to BF Fund Investor Dataroom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive SECURITY.md with vulnerability reporting and security controls documentation
- HSTS header enforcement in production environments
- Integration test workflow for sandbox APIs (Plaid, Persona)
- CI status badge in README
- Docker support for reproducible local development
  - Multi-stage Dockerfile for optimized production builds
  - docker-compose.yml with Postgres and health checks
  - docker-compose.dev.yml for database-only development
  - docker-entrypoint.sh for automatic Prisma migrations
- Unified storage abstraction layer supporting multiple providers
  - Replit Object Storage (default for Replit deployments)
  - AWS S3 and S3-compatible services
  - Cloudflare R2 storage
  - Local filesystem for development
- AES-256-GCM encryption for stored files (via STORAGE_ENCRYPTION_KEY)
- Error handling improvements with retry UI for real-time components
  - Capital tracking dashboard error states
  - Video analytics error boundaries
  - Visitor video chart fallbacks

### Fixed
- Data migration test mocks for auditLog and view models
- Admin fund dashboard test ESM compatibility

### Changed
- Added `output: "standalone"` to next.config.mjs for Docker support

### Security
- Documented known npm vulnerabilities with risk assessments
- Added Strict-Transport-Security header (1 year, includeSubDomains, preload)

## [1.0.0] - 2026-01-29

### Added
- **506(c) Compliance Suite**
  - Accreditation self-certification wizard with 4-checkbox flow
  - Persona KYC/AML integration (sandbox and production modes)
  - Comprehensive audit logging with timestamps, IP, user agent
  - NDA gate for document access control

- **LP Portal (Fundroom)**
  - Personalized investor dashboards
  - 3-step onboarding flow (account creation, NDA signature, accreditation)
  - Subscription modal with unit-based pricing
  - Per-LP document vault
  - Plaid integration for bank account linking
  - 30-second auto-refresh polling with manual refresh

- **E-Signature System (BF Fund Sign)**
  - Self-hosted e-signature with no external dependencies
  - ESIGN/UETA compliant with consent capture
  - Multi-recipient workflows (Signer, Viewer, Approver)
  - Sequential signing with configurable order
  - Bulk sending and reusable templates
  - Audit trails with embedded PDF signatures
  - SHA-256 document checksums

- **Admin/GP Dashboard**
  - Fund settings management
  - Financial aggregates (Total Raised, Distributed, Commitments)
  - Recharts visualizations
  - Bulk action wizard for capital calls and distributions
  - Dual threshold system (Initial Closing vs Full Authorized)
  - Form D compliance tracking

- **Security**
  - Four-layer encryption model (transport, storage)
  - Content Security Policy with nonces
  - Secure cookies (httpOnly, secure, sameSite)
  - Input validation and sanitization
  - Role-based access control (LP, GP, Admin, Viewer)

- **Infrastructure**
  - Next.js 16.1.6 with React 19.2.4
  - Hybrid Pages and App Router architecture
  - PostgreSQL with Prisma ORM (85+ models)
  - Unified storage abstraction (Replit, S3, R2, local)
  - Rollbar error monitoring
  - Progressive Web App support

### Changed
- Upgraded from Next.js 14 to Next.js 16
- Upgraded from React 18 to React 19
- Migrated to async cookies() API

### Security
- TLS 1.3 encryption (via hosting provider)
- AES-256-GCM server-side encryption for stored files
- Nonce-based CSP in production

## [0.1.0] - 2025-06-01

### Added
- Initial project setup
- Basic document sharing functionality
- Team management
- User authentication via NextAuth.js
