# Database & Prisma Setup Guide

This guide covers the database architecture, migration workflows, seeding, and production deployment for the BF Fund Investor Dataroom platform.

## Schema Overview

The platform uses a **single Prisma schema file** at `prisma/schema.prisma` containing **85+ models** organized by domain:

| Domain | Models | Description |
|--------|--------|-------------|
| **Core** | User, Team, Account, Session, Brand, Domain | Authentication, teams, branding |
| **Documents** | Document, DocumentVersion, DocumentPage, Folder | Document management |
| **Datarooms** | Dataroom, DataroomDocument, DataroomFolder, DataroomBrand | Secure document collections |
| **Access Control** | Link, Viewer, ViewerGroup, PermissionGroup, AccessRequest | Granular permissions |
| **E-Signatures** | SignatureDocument, SignatureRecipient, SignatureField, SignatureTemplate | E-signature workflows |
| **LP Portal** | Investor, Fund, Investment, Subscription, Transaction | Investor management |
| **Capital Management** | CapitalCall, CapitalCallResponse, Distribution, FundAggregate | Capital calls/distributions |
| **Compliance** | AuditLog, SignatureAuditLog, AccreditationAck | Audit trails, KYC |
| **Banking** | BankLink, Transaction | Plaid integration |
| **Analytics** | View, PageView, Reaction | Document tracking |

### Key Relations

```
Team
├── Users (via UserTeam) - Role-based access (ADMIN, MANAGER, MEMBER)
├── Funds - One team can have multiple funds
│   ├── Investors - LP relationships
│   │   ├── Investments - Capital commitments
│   │   ├── Subscriptions - Unit purchases
│   │   ├── BankLinks - Plaid connections
│   │   └── AccreditationAck - 506(c) compliance
│   ├── CapitalCalls - GP-initiated calls
│   ├── Distributions - Returns to LPs
│   └── FundAggregate - Cached financial totals
├── Datarooms - Secure document sharing
│   ├── Links - Shareable access links
│   ├── Viewers - External viewer access
│   └── Views - Analytics tracking
└── Documents - Team documents
    ├── SignatureDocuments - E-signature workflows
    └── DocumentVersions - Version history
```

---

## Development Setup

### Prerequisites

- PostgreSQL 14+ (Replit provides built-in Postgres)
- Node.js 18+

### Quick Start

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Open Prisma Studio (GUI)
npx prisma studio
```

### Environment Variables

```bash
# Database connection (Replit provides this automatically)
DATABASE_URL=postgresql://user:password@host:port/database
```

---

## Migration Workflows

### Development: `db push` (Recommended)

For development, use `npx prisma db push` to sync schema changes without creating migration files:

```bash
# Sync schema changes to database
npx prisma db push

# Force sync (drops data if needed)
npx prisma db push --force-reset
```

**When to use:**
- Rapid prototyping
- Adding new models/fields
- Non-production environments

### Production: Proper Migrations

For production deployments, use proper migrations to maintain data integrity:

#### Creating Migrations

Use the provided helper script:

```bash
# Create a new migration
./prisma/add-migration.sh --name add_new_feature --user postgres

# Or manually:
mkdir -p prisma/migrations/20260129000000_add_new_feature

# Generate migration SQL
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "postgresql://user@localhost:5432/shadow-db" \
  --script > prisma/migrations/20260129000000_add_new_feature/migration.sql

# Mark as applied (if already synced via db push)
npx prisma migrate resolve --applied 20260129000000_add_new_feature
```

#### Applying Migrations in Production

```bash
# Deploy pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

#### Handling Schema Drift

If you see "Drift detected" errors:

1. **Option A**: Create a baseline migration from current state
   ```bash
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/0_baseline/migration.sql
   
   npx prisma migrate resolve --applied 0_baseline
   ```

2. **Option B**: Reset migrations (development only - LOSES DATA)
   ```bash
   npx prisma migrate reset
   ```

---

## Seeding

### Test Data Seeding

For development/testing, use the test seed script:

```bash
npx ts-node prisma/test-seed.ts
```

This creates:
- Test Admin/GP user
- Test LP Investor user
- Test Viewer user
- Test Team with Fund
- Sample investments and subscriptions

**Options:**
```bash
# Clean existing test data first
npx ts-node prisma/test-seed.ts --clean
```

### Data Import/Export

For restoring data from exports:

```bash
npx ts-node prisma/seed.ts --file=./backup/export.json --team=team_id

# Dry run (validate without making changes)
npx ts-node prisma/seed.ts --file=./backup/export.json --dry-run
```

### Required Initial Data

For a fresh production deployment, you need:

1. **Admin User** - Create via Google OAuth login
2. **Team** - Created automatically on first admin login
3. **Fund** - Created via Admin Dashboard
4. **Pricing Tiers** (optional) - For blended unit pricing

---

## Performance Optimization

### Existing Indexes

The schema includes performance indexes on frequently queried columns:

| Model | Indexed Columns | Purpose |
|-------|----------------|---------|
| View | linkId, documentId, dataroomId, viewedAt, viewerEmail | Analytics queries |
| PageView | documentId, pageNumber, versionNumber | Page-level tracking |
| AuditLog | teamId, userId, eventType, createdAt | Compliance queries |
| Viewer | teamId, dataroomId, accessRevokedAt | Access control |
| ViewerNote | teamId, viewerId | Notes lookup |
| Investment | fundId, investorId | Portfolio queries |
| Transaction | investorId, fundId, status | Payment tracking |
| SignatureAuditLog | documentId, createdAt | Signature compliance |

### Current Index Coverage

The schema is well-optimized with indexes on:

- **Fund**: `teamId`, `createdBy`
- **Investor**: `userId` (unique), `fundId`, `accreditationStatus`
- **View**: `linkId`, `documentId`, `dataroomId`, `viewedAt`, `viewerEmail`, composite indexes
- **AuditLog**: `teamId`, `userId`, `eventType`, `createdAt`
- **BankLink**: `investorId`, `status`
- **Transaction**: `investorId`, `fundId`, `bankLinkId`, `status`

For high-volume production deployments, consider adding composite indexes for common query patterns:

```prisma
// Example: If frequently querying investors by fund + KYC status
@@index([fundId, personaStatus])

// Example: If filtering funds by status
@@index([status])
```

### Preventing N+1 Queries

The schema enables `relationJoins` preview feature for optimized relation loading:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationJoins"]
}
```

Use `include` with specific fields to avoid over-fetching:

```typescript
// Good: Specific includes
const fund = await prisma.fund.findUnique({
  where: { id: fundId },
  include: {
    investors: { select: { id: true, email: true } },
    _count: { select: { investments: true } }
  }
});

// Bad: Deep nesting without limits
const fund = await prisma.fund.findUnique({
  where: { id: fundId },
  include: {
    investors: {
      include: {
        investments: {
          include: { transactions: true }
        }
      }
    }
  }
});
```

---

## Backup & Recovery

### Database Backups

On Replit, PostgreSQL backups are managed automatically. For self-hosted:

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260129.sql
```

### Data Export

Use the Admin Dashboard export feature or API:

```bash
# Export fund data via API
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/admin/export?fundId=fund_xxx \
  > export.json
```

---

## Troubleshooting

### Common Issues

**"Prisma Client not generated"**
```bash
npx prisma generate
```

**"Database connection refused"**
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL is running
- Verify network/firewall settings

**"Migration failed"**
```bash
# Check migration status
npx prisma migrate status

# Reset if development (LOSES DATA)
npx prisma migrate reset

# Force sync in emergency
npx prisma db push --force-reset
```

**"Relation not found" errors**
```bash
# Regenerate client after schema changes
npx prisma generate
```

### Schema Validation

```bash
# Validate schema syntax
npx prisma validate

# Format schema file
npx prisma format
```

---

## Production Checklist

- [ ] `DATABASE_URL` configured with production credentials
- [ ] Connection pooling enabled (if high traffic)
- [ ] Migrations applied via `prisma migrate deploy`
- [ ] Backup strategy configured
- [ ] Indexes reviewed for query patterns
- [ ] Admin user created and verified
- [ ] Initial Fund created via dashboard
