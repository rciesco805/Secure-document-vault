# Papermark Reference Documentation

> Local reference library for BF Fund Dataroom (customized Papermark)

---

## CRITICAL: Platform-Agnostic Build Requirements

> **All features MUST be platform-wide solutions, NOT tied to any specific dataroom.**

### Build Rules
1. **No hardcoded IDs** - Never use specific dataroom, team, link, or document IDs in code
2. **Dynamic references only** - All IDs must come from URL parameters, database queries, or user context
3. **Dataroom lifecycle independent** - If a dataroom is deleted and a new one created, ALL features must work on the new dataroom automatically
4. **Use parameterized routes** - API routes must use `[teamId]`, `[dataroomId]`, `[linkId]` patterns

### Verification Checklist (Before Each Deploy)
- [ ] No CUID patterns (cmj*, clp*) in source code
- [ ] All API routes use dynamic parameters
- [ ] Database queries filter by passed-in IDs, not constants
- [ ] Email templates use props for all dataroom-specific content

---

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
| Auth | Multiple providers | Magic link only, **1-hour expiration** |
| Admin Access | Any registered user | Allowlist: 2 specific emails only |
| File Storage | Vercel Blob / S3 | Replit Object Storage (AES-256) |
| Analytics | Tinybird (required) | **PostgreSQL only** (Tinybird NOT used) |
| Branding | Papermark branding | BF Fund / Bermuda Franchise Group |
| Billing | Stripe integration | Completely disabled |
| Rate Limiting | Upstash Redis (required) | Upstash optional (graceful fallback) |
| Bulk Download | AWS Lambda ZIP creation | Disabled (not supported on Replit) |

### Analytics System Difference

**Stock Papermark** requires Tinybird for page-level analytics (time spent, completion %).

**BF Fund** uses PostgreSQL as the **only** analytics storage (Tinybird is NOT used):
- `PageView` model stores page-level duration data
- Stats queries use SQL aggregation instead of Tinybird API
- Helper functions in `lib/tracking/postgres-stats.ts`
- Same data displayed in dashboard, fully self-contained
- Tinybird legacy code exists but gracefully skipped when `TINYBIRD_TOKEN` not set

### Quick Add Email Workflow

**Stock Papermark** sends basic admin notifications when visitors request access.

**BF Fund** streamlines investor onboarding:
- Access request emails include BOTH buttons:
  - "Quick Add This Investor" (amber) - one-click add with pre-filled email
  - "Enter The Dataroom" (black) - sign in and review first
- Quick Add button contains magic link + pre-filled email parameter
- Redirects to `/admin/quick-add?email=<investor_email>`
- Admin selects dataroom (dynamic selector, works for ANY dataroom), clicks "Add & Send Invite"
- Investor receives magic link instantly

### Session Cookie System

Session cookies enable seamless document navigation within a dataroom:
- Cookie name: `pm_drs_flag_${linkId}` (uses dynamic linkId)
- Expiry: 1 hour
- Works with or without Redis (graceful fallback)
- Once verified, visitors browse freely without re-entering email

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
