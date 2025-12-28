# Papermark Reference Documentation

> Local reference library for BF Fund Dataroom (customized Papermark)

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System design, component relationships, PDF rendering |
| [Data Models](./data-models.md) | Entity relationships and database schema |
| [Auth Flow](./auth-flow.md) | Magic link authentication and session management |
| [File Storage](./file-storage.md) | Replit Object Storage integration |
| [UI Patterns](./ui-patterns.md) | SWR, forms, and component conventions |
| [API Conventions](./api-conventions.md) | API route patterns and authentication |

## Key Customizations (BF Fund vs. Stock Papermark)

| Area | Stock Papermark | BF Fund Customization |
|------|-----------------|----------------------|
| Plan System | Multi-tier (Free, Pro, Business, Enterprise) | Always `datarooms-plus` (all features enabled) |
| Auth | Multiple providers | Magic link only, 20-min expiration |
| Admin Access | Any registered user | Allowlist: 3 specific emails only |
| File Storage | Vercel Blob / S3 | Replit Object Storage (AES-256) |
| Branding | Papermark branding | BF Fund / Bermuda Franchise Group |
| Billing | Stripe integration | Completely disabled |

## Core Entities Relationship

```
Team (organization)
  ├── Users (admin members)
  ├── Datarooms
  │     ├── Folders
  │     ├── Documents
  │     ├── ViewerGroups (including Quick Add)
  │     │     ├── Members (Viewers)
  │     │     └── AccessControls
  │     └── Links
  │           ├── AllowList (emails)
  │           └── Views (analytics)
  └── Viewers (document recipients)
```

## Session Start Protocol

At the start of each session, the agent should:
1. Read `replit.md` for project context
2. Check workflow status and logs
3. Review recent git commits
4. Run basic health checks if needed

See `/docs/runbooks/session-checks.md` for detailed procedures.
