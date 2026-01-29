# Deployment Guide

Complete guide for deploying BF Fund Investor Dataroom to various environments.

---

## Recent Deployment Updates (January 2026)

### Critical Configuration Changes

1. **Middleware File**: Next.js 16 requires `proxy.ts` (not `middleware.ts`). The file has been renamed.

2. **Service Worker Exclusions**: The middleware matcher now excludes PWA files to prevent redirect issues:
   - `sw.js`, `sw-version.json`, `manifest.json`, `/offline`

3. **Verification Secret**: `NEXT_PRIVATE_VERIFICATION_SECRET` must be consistent across environments. Set in "shared" environment to ensure both dev and prod use the same value.

4. **Rollbar Tokens**: Use "post_client_item" scope tokens for `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN`, NOT the Public ID.

### Environment Variables Structure

| Environment | Purpose |
|-------------|---------|
| **Shared** | Variables that must be identical in dev and prod (e.g., `NEXT_PRIVATE_VERIFICATION_SECRET`) |
| **Development** | Dev-specific values (sandbox keys, dev URLs) |
| **Production** | Prod-specific values (live keys, production domain) |

---

## Deployment Options

| Platform | Best For | Complexity |
|----------|----------|------------|
| **Replit** | Quick start, prototyping | Low |
| **Docker** | Self-hosted, VPS, on-premises | Medium |
| **Vercel** | Production web apps | Low |
| **AWS/GCP** | Enterprise, custom infrastructure | High |

---

## Replit Deployment

Replit provides the simplest deployment path with built-in database and storage.

### Automatic Configuration

Replit automatically provides:
- PostgreSQL database (`DATABASE_URL`)
- Object Storage (when `STORAGE_PROVIDER=replit`)
- HTTPS with custom domains
- Automatic scaling

### Required Secrets

Set these in Replit Secrets panel (Secrets tab in left sidebar):

**Core Authentication:**
```
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

**External Integrations:**
```
# Plaid (Banking/ACH)
PLAID_CLIENT_ID=<from Plaid dashboard>
PLAID_SECRET=<from Plaid dashboard>

# Persona (KYC/AML)
PERSONA_API_KEY=<from Persona dashboard>
PERSONA_WEBHOOK_SECRET=<from Persona webhook settings>
PERSONA_TEMPLATE_ID=<your verification template ID>

# Stripe (Payments)
STRIPE_SECRET_KEY=<from Stripe dashboard>
STRIPE_WEBHOOK_SECRET=<from Stripe webhook settings>

# Resend (Email)
RESEND_API_KEY=<from Resend dashboard>

# Analytics
TINYBIRD_TOKEN=<from Tinybird workspace settings>

# Error Monitoring
ROLLBAR_SERVER_TOKEN=<from Rollbar project>
NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN=<from Rollbar project>
```

### Production vs Development Secrets

Replit supports separate environments. Set in respective tabs:

| Secret | Development | Production |
|--------|-------------|------------|
| `PLAID_ENV` | `sandbox` | `production` |
| `PERSONA_ENVIRONMENT` | `sandbox` | `production` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `NEXTAUTH_URL` | Dev domain | Production domain |

### Differences from Self-Hosted

| Feature | Replit | Self-Hosted |
|---------|--------|-------------|
| Database | Auto-provisioned | Manual setup |
| Storage | Replit Object Storage | S3/R2/Local |
| SSL/TLS | Automatic | Configure reverse proxy |
| Scaling | Automatic | Manual |
| Backups | Replit-managed | Your responsibility |

---

## Docker Deployment

For VPS, on-premises, or containerized environments.

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd bf-fund-dataroom

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Build and run
docker-compose up --build -d
```

### Production Configuration

**docker-compose.prod.yml**:
```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: bf_fund_dataroom
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/bf_fund_dataroom
      NEXTAUTH_URL: https://your-domain.com
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy

  # Optional: Reverse proxy with auto-SSL
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - app

volumes:
  postgres_data:
  caddy_data:
```

**Caddyfile** (for Caddy reverse proxy):
```
your-domain.com {
    reverse_proxy app:3000
}
```

---

## Vercel Deployment

Vercel provides easy deployment for Next.js applications with automatic builds and previews.

### Prerequisites

1. Vercel account connected to your Git repository
2. External PostgreSQL database (Neon, Supabase, Railway, or AWS RDS)
3. External object storage (AWS S3 or Cloudflare R2)

### Step 1: Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel auto-detects Next.js configuration

### Step 2: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

**Required Variables:**
```
# Database (external PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/bf_fund_dataroom

# Authentication
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Storage (S3 or R2)
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=<AWS access key>
STORAGE_SECRET_ACCESS_KEY=<AWS secret key>
STORAGE_ENCRYPTION_KEY=<64-char hex string for AES-256>

# For Cloudflare R2:
# STORAGE_PROVIDER=r2
# STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

**External Services (same as Replit):**
```
# Plaid
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=production

# Persona
PERSONA_API_KEY=xxx
PERSONA_WEBHOOK_SECRET=xxx
PERSONA_ENVIRONMENT=production

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Other integrations
RESEND_API_KEY=xxx
TINYBIRD_TOKEN=xxx
ROLLBAR_SERVER_TOKEN=xxx
NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN=xxx
```

### Step 3: Configure Build Settings

Vercel auto-detects these, but verify in Project Settings → General:

```
Build Command: npm run build
Output Directory: .next
Install Command: npm ci
```

### Step 4: Database Migration

Before first deployment or after schema changes:

```bash
# Set DATABASE_URL to production
export DATABASE_URL=postgresql://user:password@host:5432/bf_fund_dataroom

# Run migrations
npx prisma migrate deploy

# Or for initial setup
npx prisma db push
```

### Step 5: Configure Webhooks

Update webhook URLs in external services to point to Vercel domain:

| Service | Webhook URL |
|---------|-------------|
| Persona | `https://your-domain.vercel.app/api/webhooks/persona` |
| Stripe | `https://your-domain.vercel.app/api/webhooks/stripe` |
| Plaid | `https://your-domain.vercel.app/api/webhooks/plaid` |

### Vercel-Specific Considerations

**Function Timeout:**
- Hobby: 10 seconds
- Pro: 60 seconds
- Enterprise: 900 seconds

For long-running operations (PDF generation, large uploads), consider Pro plan or use background jobs.

**Cold Starts:**
Edge functions have faster cold starts. Consider for high-traffic API routes.

**Preview Deployments:**
Set `NEXTAUTH_URL` as an environment variable with "Preview" scope:
```
NEXTAUTH_URL=https://$VERCEL_URL
```

### Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your domain (e.g., `dataroom.yourdomain.com`)
3. Configure DNS with provided CNAME/A records
4. SSL is automatically provisioned

---

## Production Checklist

### Security

- [ ] Generate unique `NEXTAUTH_SECRET` (min 32 characters)
- [ ] Use strong database passwords
- [ ] Enable HTTPS/TLS (automatic with Caddy/Vercel/Replit)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CSP headers (automatic)
- [ ] Enable HSTS (automatic in production)
- [ ] Review rate limiting configuration
- [ ] Rotate secrets periodically (see Security Hardening)

### Database

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Configure connection pooling for high traffic
- [ ] Set up automated backups (see Backup Strategy)
- [ ] Monitor query performance

### Storage

- [ ] Configure storage provider (`STORAGE_PROVIDER`)
- [ ] Set encryption key (`STORAGE_ENCRYPTION_KEY`)
- [ ] Verify bucket permissions (for S3/R2)
- [ ] Test file upload/download

### External Services

- [ ] Configure production Plaid keys (`PLAID_ENV=production`)
- [ ] Configure production Persona keys (`PERSONA_ENVIRONMENT=production`)
- [ ] Configure production Stripe keys (remove `sk_test_` prefix)
- [ ] Verify webhook endpoints are publicly accessible
- [ ] Test end-to-end flows

### Monitoring

- [ ] Configure Rollbar (`ROLLBAR_SERVER_TOKEN`)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for errors

---

## Security Hardening

### Secrets Rotation

Rotate secrets on a regular schedule:

| Secret | Rotation Frequency | Notes |
|--------|-------------------|-------|
| `NEXTAUTH_SECRET` | Quarterly | Invalidates existing sessions |
| `STORAGE_ENCRYPTION_KEY` | Annually | Requires re-encryption of files |
| Database password | Quarterly | Update connection strings |
| API keys (Plaid/Persona/Stripe) | As needed | Regenerate in dashboards |

**Rotation Procedure**:
1. Generate new secret value
2. Update in production environment
3. Deploy application
4. Monitor for authentication/access issues
5. Remove old secret from backups

### Rate Limiting (Recommended)

Rate limiting is recommended for production deployments but not currently implemented in the application. Consider adding:

- Login attempts: 5 per 15 minutes
- Password reset: 3 per hour
- API calls: 1000 per hour (authenticated)

See `SECURITY.md` for implementation examples using `rate-limiter-flexible`.

### CORS Configuration

CORS is configured in `next.config.mjs`. For production:

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
      ],
    },
  ];
}
```

---

## Backup Strategy

### Database Backups

**Automated Daily Backups** (PostgreSQL):
```bash
#!/bin/bash
# backup-db.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"

pg_dump $DATABASE_URL | gzip > /backups/$BACKUP_FILE

# Retain last 30 days
find /backups -name "*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp /backups/$BACKUP_FILE s3://your-backup-bucket/db/
```

**Cron Schedule**:
```bash
0 2 * * * /path/to/backup-db.sh  # Daily at 2 AM
```

### File Storage Backups

**For S3/R2**: Enable versioning on the bucket

**For Local Storage**:
```bash
#!/bin/bash
# backup-storage.sh
TIMESTAMP=$(date +%Y%m%d)
tar -czf /backups/storage_${TIMESTAMP}.tar.gz /app/.storage

# Upload to remote storage
aws s3 cp /backups/storage_${TIMESTAMP}.tar.gz s3://your-backup-bucket/files/
```

### Backup Retention

| Data Type | Retention | Storage |
|-----------|-----------|---------|
| Database (daily) | 30 days | Local + S3 |
| Database (weekly) | 1 year | S3 Glacier |
| File storage | Indefinite | S3 versioning |
| Audit logs | 7 years | Database |

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 24 hours (daily backups)

**Recovery Steps**:
1. Provision new infrastructure
2. Restore database from latest backup
3. Restore file storage from backup
4. Update DNS to point to new infrastructure
5. Verify application functionality
6. Monitor for issues

---

## Environment-Specific Settings

### Development
```
NODE_ENV=development
STORAGE_PROVIDER=local
PLAID_ENV=sandbox
PERSONA_ENVIRONMENT=sandbox
DEBUG_WEBHOOKS=true
```

### Staging
```
NODE_ENV=production
STORAGE_PROVIDER=s3
PLAID_ENV=sandbox
PERSONA_ENVIRONMENT=sandbox
```

### Production
```
NODE_ENV=production
STORAGE_PROVIDER=s3
PLAID_ENV=production
PERSONA_ENVIRONMENT=production
```

---

## Monitoring & Alerts

### Health Endpoints

- Application health can be monitored via successful page loads or API responses
- Prisma Studio: `npx prisma studio` (development only)

> **Note:** A dedicated `/api/health` endpoint is recommended for production monitoring but may need to be created if not present.

### Recommended Monitoring

1. **Uptime**: Pingdom, UptimeRobot, or similar
2. **Errors**: Rollbar (built-in integration)
3. **Performance**: Vercel Analytics or custom APM
4. **Database**: pg_stat_statements for query analysis

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | >1% | >5% |
| Response time (p95) | >2s | >5s |
| Database connections | >80% | >95% |
| Disk usage | >80% | >95% |
