# BF Fund Investor Dataroom - Reference Memo

## Overview
The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), built on the Papermark platform. Its primary purpose is to enable secure sharing of confidential investment documents with verified investors. The platform emphasizes email-verified access, custom branding, and detailed page-by-page analytics. It operates under the tagline "Work Well. Play Well. Be Well." and is deployed on Replit, with all premium features unlocked and billing functionalities disabled.

## User Preferences
- **Communication style**: Simple, everyday language
- **Technical level**: Non-technical explanations preferred
- **Focus**: Security and ease of use for investors

## System Architecture
The project is built on **Next.js 14** using the **Pages Router** (not App Router for main functionality), **TypeScript**, and styled with **Tailwind CSS** and **shadcn/ui**. Data fetching is handled by **SWR**, forms by **React Hook Form** with **Zod**, and state management uses **React hooks** and **Context**. The backend utilizes **PostgreSQL** via **Prisma ORM** for the database, **NextAuth.js** for magic link authentication, and **Resend API** for email delivery. File storage leverages **Replit Object Storage** for AES-256 encrypted file storage, replacing Vercel Blob.

**Key Design Decisions:**
- **Self-hosted**: All billing, payment, and plan restriction code is disabled; hardcoded to `datarooms-plus` plan.
- **Authentication**: Magic link authentication only, with a 20-minute expiration.
- **Admin Access**: Restricted to an allowlist of specific email addresses.
- **Email Verification**: All document access requires email verification (`emailProtected=true`).
- **Session-based Access**: Email verification is required once per session (`emailAuthenticated=false`).
- **Downloads Disabled**: Document downloads are disabled by default (`allowDownload=false`).
- **UI/UX**: Features light/dark mode, branded with BFG logos and assets.
- **Branding**: All references to "Papermark.com" are removed and replaced with "BF Fund Dataroom".
- **File Uploads**: Presigned URLs are used for direct uploads to and retrieval from Replit Object Storage.

**Core Features & Implementations:**
- **Authentication Flow**: User enters email, receives magic link via Resend, clicks link for auto-redirect to dashboard.
- **File Upload Flow**: Frontend requests presigned URL, uploads directly to Replit Object Storage, path stored in DB.
- **Data Fetching**: Consistent use of SWR for API calls.
- **Team Management**: Utilizes a `useTeam()` context for team-specific data.
- **Admin Emails**: Managed in `lib/constants/admins.ts`.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Resend API**: For sending magic links and other email notifications.
- **Replit Object Storage**: For encrypted file storage and retrieval.
- **NextAuth.js**: Authentication library.
- **Prisma ORM**: Database toolkit.
- **Tailwind CSS**: Styling framework.
- **shadcn/ui**: UI component library.
- **SWR**: Data fetching library.
- **React Hook Form & Zod**: Form management and validation.
- **TINYBIRD_TOKEN (Optional)**: For analytics, with a fallback to PostgreSQL-based tracking if not configured.
- **UPSTASH_REDIS_REST_URL (Optional)**: For rate limiting, with a graceful fallback if not configured.