# Deployment Guide

Complete guide for deploying BF Fund Investor Dataroom to various environments.

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

Set these in Replit Secrets panel:
```
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

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
