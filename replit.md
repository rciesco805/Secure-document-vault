# BF Fund Investor Dataroom

## Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), deployed on Replit with a custom domain. It integrates two primary platforms:

1.  **BF Fund Dataroom**: A secure document sharing platform for investors, featuring visitor access management, one-click magic link authentication, and admin approval workflows. It enables custom branding, page-level analytics, and folder organization.
2.  **BF Fund Sign**: A DocuSign-style e-signature platform that supports signature fields, templates, bulk sending, QR signing, and comprehensive audit trails. This system is custom-built and self-hosted, drawing inspiration from OpenSign's architecture but entirely implemented within the codebase without external API dependencies.

The platform aims to provide a comprehensive, UX-first solution for GPs managing private investments, with future plans to evolve into a full GP/LP fund management suite offering personalized investor dashboards, fundraise tracking, investment document management, and automated capital management.

## User Preferences

-   Communication style: Simple, everyday language
-   Technical level: Non-technical explanations preferred
-   Focus: Security and ease of use for investors

## System Architecture

The platform is built on Next.js 14, utilizing a hybrid Pages and App Router approach, with TypeScript for language, Tailwind CSS and shadcn/ui for styling, and PostgreSQL with Prisma ORM for the database. Authentication is handled by NextAuth.js, and email services are powered by Resend API. File storage leverages Replit Object Storage (AES-256 encrypted) and supports S3-compatible and TUS resumable uploads.

**Core Features:**

*   **Investor Dataroom**: Secure document sharing, custom branding, folder hierarchy, page-level analytics, and custom domain support.
*   **Email Verification Flow**: Multi-step verification with OTP for secure access, persisting for one day via cookies.
*   **BF Fund Sign (E-Signature)**: Drag-and-drop field placement, multi-recipient roles (Signer, Viewer, Approver), sequential signing, bulk sending, in-person QR signing, document expiration, 'Correct & Resend' functionality, reusable templates, and detailed audit trails with embedded PDF signatures.
*   **Authentication**: Primarily via email magic links, with Google OAuth for admin users.
*   **Admin/Viewer Separation**: Distinct interfaces and server-side protection based on user roles (SUPER\_ADMIN, ADMIN, MANAGER, MEMBER).
*   **Hybrid Routing Architecture**: Pages Router for the main application, API routes, and viewer pages; App Router for authentication, Enterprise Edition (EE) APIs, and admin pages.
*   **Database Schema**: A comprehensive Prisma schema incorporating models for Users, Teams, Documents, Datarooms, Links, Viewers, E-signatures (SignatureDocument, SignatureRecipient, SignatureField, SignatureTemplate), Analytics, and Q&A. This is designed for extensibility to support future GP/LP fund management features.
*   **UI/UX**: Emphasis on a UX-first approach with mobile-responsive design using Tailwind CSS and shadcn/ui components, aiming for minimal clicks and guided wizards for critical flows.

## External Dependencies

*   **Database**: PostgreSQL (hosted on Replit)
*   **ORM**: Prisma
*   **Authentication**: NextAuth.js
*   **Email Service**: Resend API
*   **Object Storage**: Replit Object Storage (S3-compatible, TUS resumable uploads)
*   **PDF Processing**: pdf-lib, MuPDF
*   **AI (Optional)**: OpenAI API
*   **UI Primitives**: Radix UI
*   **Form Handling**: React Hook Form, Zod