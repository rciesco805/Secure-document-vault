# BF Fund Investor Dataroom - Project Documentation

## Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG). It provides a secure dataroom for document sharing with verified investors, a DocuSign-style e-signature platform (BF Fund Sign) for legal documents, an Admin Portal for management by authorized team members, and a Viewer Portal for read-only investor access. The project aims to "Work Well. Play Well. Be Well." and is deployed on Replit with a custom domain at `dataroom.bermudafranchisegroup.com`.

## User Preferences

- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## Recent Changes (January 2026)

### Bug Fixes
- **Fixed 404 errors on document navigation**: Corrected URL routing in folder tree component from `/view/${linkId}/document/...` to `/view/${linkId}/d/...` to match actual Next.js page structure
- **Fixed "Add a custom domain" modal not opening**: Updated AddDomainModal to conditionally render DialogTrigger only when children are provided, resolving modal display issues
- **Fixed verification cookie persistence**: Restored verification token cookies (pm_vft and pm_drs_flag variants) that were commented out, preventing document access failures across routes

### URL Routing Patterns
- All viewer document navigation uses `/d/` path segment (e.g., `/view/[linkId]/d/[documentId]`)
- Custom domain routes follow pattern `/view/domains/[domain]/[slug]/d/[documentId]`

### Cookie System for Verification
- `pm_vft`: Global verification token with path="/" for cross-route compatibility
- `pm_drs_flag_${linkId}`: Link-specific verification flag
- `pm_drs_flag_${slug}`: Slug-specific verification flag for custom domains
- All cookies expire after 1 day

## System Architecture

The platform is built on Next.js 14 (Pages Router) using TypeScript, Tailwind CSS, and shadcn/ui. It utilizes a platform-agnostic design, ensuring dynamic implementation without hardcoded IDs.

**UI/UX Decisions:**
- Custom branding ("BF Fund Dataroom" or "BF Fund Sign")
- Mobile-responsive design
- Auto-adjusting text color for readability
- Dark theme throughout

## Feature Specifications

### Investor Dataroom
- Secure, email-verified document sharing with custom branding
- "Quick Add" investor onboarding
- PostgreSQL-based page-level analytics
- Folder tree navigation with proper routing
- Custom domain support for branded URLs

### Email Verification Flow
- **"Require email to view"**: Asks viewer for their email before accessing
- **"Require email verification"**: Sends OTP code to verify email ownership
- Verification persists via cookies for 1 day - viewers verify once, then browse freely within the dataroom
- Authenticated users (via magic link) bypass OTP entirely

### BF Fund Sign (E-Signature Platform)
- Document creation and recipient management (signers, viewers, approvers)
- Draggable field placement editor with field types: Signature, Initials, Date, Text, Checkbox, Name, Email, Title, Company, Address
- Required field indicators
- Sequential signing workflow
- Bulk sending capabilities
- In-person signing via QR codes
- Document expiration settings
- "Correct & Resend" functionality
- Reusable templates
- Comprehensive audit trails
- PDF download with embedded signatures

### Security Features
- Token-based access with per-recipient authorization
- Expiration enforcement
- Transactional database updates
- Comprehensive audit logging
- IP-based rate limiting

### Admin/Viewer Separation
- Users with `UserTeam` record access Admin Dashboard
- Users without `UserTeam` record (investors) redirect to read-only Viewer Portal
- Server-side protection via `withAdminGuard()` for all admin pages

### Role Hierarchy
- **SUPER_ADMIN**: One per team, can remove admins, cannot be removed (must transfer role first)
- **ADMIN**: Full access except removing admins
- **MEMBER**: Standard team member access
- Initial super admin for Bermuda Franchise Fund: investors@bermudafranchisegroup.com

### Q&A System
- Viewers can "Leave a Note" or "Ask a Question" privately
- Context tracking (document, dataroom, page number)
- Status management: OPEN, ANSWERED, CLOSED
- Email notifications for both parties

### Welcome Screen
- Configurable welcome modal for first-time visitors
- Personal note and suggested viewing guidance
- Reorderable list of recommended documents

### Authentication
- **Magic Link Direct Redirect**: Links guide viewers directly to approved dataroom
- **One-Click Authentication**: Authenticated users with verified access bypass OTP verification
- **Configurable Email Verification**: Toggle controls extra verification steps

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Database | Replit PostgreSQL (primary) with Prisma ORM |
| Authentication | NextAuth.js with email magic links, Google OAuth for admins |
| Storage | Replit Object Storage with AES-256 encryption |
| Email | Resend API |
| PDF Processing | pdf-lib for signature embedding |
| QR Codes | qrcode.react |

## Key Files Reference

### Viewer Components
- `components/view/dataroom/dataroom-view.tsx` - Main dataroom viewer with verification logic
- `components/view/dataroom/dataroom-document-view.tsx` - Individual document viewer
- `components/datarooms/folders/view-tree.tsx` - Folder tree navigation for viewers

### Pages
- `pages/view/[linkId]/index.tsx` - Dataroom entry point
- `pages/view/[linkId]/d/[documentId].tsx` - Document view page
- `pages/view/domains/[domain]/[slug]/index.tsx` - Custom domain dataroom entry
- `pages/view/domains/[domain]/[slug]/d/[documentId].tsx` - Custom domain document view

### Domain Management
- `components/domains/add-domain-modal.tsx` - Add custom domain modal
- `components/links/link-sheet/domain-section.tsx` - Domain selection in link settings

## Deployment

- **Platform**: Replit
- **Custom Domain**: dataroom.bermudafranchisegroup.com
- **Deployment**: Use Replit's publish/deploy feature
- **After code changes**: Redeploy required for production updates

## External Dependencies

- **PostgreSQL**: Primary database for application data and analytics
- **Resend API**: Magic links and notification emails
- **Replit Object Storage**: Encrypted (AES-256) file storage
- **pdf-lib**: Embedding signatures into downloaded PDFs
- **qrcode.react**: QR code generation for in-person signing
