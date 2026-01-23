# BF Fund Investor Dataroom

## Overview

A comprehensive 506(c) fund GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for both fund managers and limited partners. Key capabilities include investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture

The platform is built on Next.js 14, using a hybrid Pages and App Router architecture with TypeScript. Styling is managed with Tailwind CSS and shadcn/ui. PostgreSQL with Prisma ORM serves as the database, and NextAuth.js handles authentication. Email services are provided by Resend API, and file storage utilizes Replit Object Storage, supporting S3-compatible and TUS resumable uploads.

**Core Features and Design:**

*   **Investor Dataroom**: Provides secure, branded document sharing with folder hierarchies and page-level analytics.
*   **BF Fund Sign (E-Signature)**: A self-hosted e-signature solution featuring drag-and-drop field placement, multi-recipient workflows (Signer, Viewer, Approver), sequential signing, bulk sending, reusable templates, and detailed audit trails with embedded PDF signatures.
*   **LP Fundroom Portal**: Offers personalized investor dashboards including a 3-step onboarding process, a 2-step accreditation wizard with SEC 506(c) compliance logging, a per-LP document vault for signed documents, and a section for pending signatures. It also integrates Persona for KYC/AML verification and Plaid for bank account linking.
*   **Admin and GP Dashboards**: Features include fund settings with NDA gate toggling, comprehensive fund overviews with financial aggregates (Total Raised, Distributed, Commitments), Recharts visualizations, and a bulk action wizard for capital calls or distributions.
*   **Authentication and Authorization**: Utilizes email magic links and Google OAuth for admin users. A role-based access control system (`LP` and `GP` roles) ensures data segregation and appropriate access levels, with `LP` users restricted to their own data and `GP` users having full access to fund aggregates within their teams. Distinct interfaces and server-side protection are implemented based on user roles.
*   **Hybrid Routing**: Employs Pages Router for the main application, API routes, and viewer pages, while App Router is used for authentication and admin pages.
*   **Database Schema**: A comprehensive Prisma schema supports various functionalities, including Users, Teams, Documents, E-signatures, LP Portal (Investor, Fund, Investment, CapitalCall, Distribution, BankLink), and Analytics, designed for extensibility.
*   **UI/UX**: Prioritizes a UX-first approach with mobile-responsive design, using Tailwind CSS and shadcn/ui for components, aiming for intuitive, guided workflows.

## External Dependencies

*   **Resend**: Transactional email services.
*   **Persona**: KYC/AML verification.
*   **Plaid**: Bank connectivity for capital calls and distributions.
*   **Tinybird**: Real-time analytics.
*   **Google OAuth**: Authentication for admin users.
*   **OpenAI**: Optional AI features.
*   **Stripe**: Future payment processing integration.
*   **Replit Object Storage**: Primary storage solution for documents and files.