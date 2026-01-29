# Troubleshooting Guide

Common issues and solutions for BF Fund Investor Dataroom.

---

## Startup Errors

### "Unable to connect to database"

**Cause**: Database connection string is invalid or database is not running.

**Solutions**:
1. Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
2. For Docker: Ensure `docker-compose up -d db` is running
3. For Replit: Database is auto-provisioned; check Replit dashboard
4. Verify network connectivity to database host

```bash
# Test database connection (verify connectivity only)
npx prisma db pull  # Safe: reads schema, doesn't modify data

# WARNING: The following command DESTROYS ALL DATA - use only in local development
# npx prisma db push --force-reset
```

### "NEXTAUTH_SECRET must be set"

**Cause**: Missing authentication secret.

**Solution**: Generate a secure secret:
```bash
openssl rand -base64 32
```
Add to `.env.local`:
```
NEXTAUTH_SECRET=your-generated-secret
```

### "Cannot find module '@prisma/client'"

**Cause**: Prisma client not generated.

**Solution**:
```bash
npx prisma generate
```

---

## Storage Errors

### "Storage provider not configured"

**Cause**: Invalid or missing `STORAGE_PROVIDER` value.

**Solutions**:
1. Set `STORAGE_PROVIDER` to: `replit`, `s3`, `r2`, or `local`
2. For local development, use:
   ```
   STORAGE_PROVIDER=local
   STORAGE_LOCAL_PATH=./.storage
   ```

### "S3 bucket access denied"

**Cause**: Invalid AWS credentials or bucket permissions.

**Solutions**:
1. Verify `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`
2. Check bucket policy allows your IAM user
3. For R2/MinIO, set `STORAGE_ENDPOINT` correctly:
   ```
   STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   ```

### Storage Configuration

The application uses a single storage provider at a time. There is no built-in automatic fallback.

```bash
# Configure primary storage provider
STORAGE_PROVIDER=s3
STORAGE_BUCKET=my-bucket
STORAGE_REGION=us-east-1
```

**High-Availability Recommendations:**
- Use managed services with built-in redundancy (S3, R2)
- Enable bucket versioning for recovery
- Monitor storage health via provider dashboards
- Set up alerts for storage failures

---

## Authentication Errors

### "Invalid redirect URI"

**Cause**: OAuth callback URL mismatch.

**Solutions**:
1. Set `NEXTAUTH_URL` to your exact deployment URL (no trailing slash)
2. Update Google OAuth authorized redirect URIs to include:
   - `https://your-domain.com/api/auth/callback/google`
3. For Replit, use your `.replit.app` domain

### "Magic link expired"

**Cause**: Link used after 24-hour expiry or already consumed.

**Solution**: Request a new magic link. Links are single-use.

---

## Build Errors

### "Type errors during build"

**Cause**: TypeScript strict mode violations.

**Solutions**:
1. Run `npm run lint` to identify issues
2. Check for missing type definitions
3. Review `tsconfig.json` strictness settings

### "Module not found: @/components/..."

**Cause**: Path alias not resolved.

**Solution**: Verify `tsconfig.json` paths configuration:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Runtime Errors

### "CSP blocked script/connection"

**Cause**: Third-party domain not whitelisted in Content Security Policy.

**Solutions**:
1. Check browser console for blocked domain
2. Add domain to `lib/middleware/csp.ts`:
   - Scripts: `trustedScriptDomains`
   - API calls: `trustedConnectDomains`
   - Images: `trustedImageDomains`

### "PDF rendering failed"

**Cause**: Corrupted PDF or incompatible format.

**Solutions**:
1. Ensure PDF is not password-protected
2. Check PDF version (2.0 recommended)
3. Try re-uploading the document

### "Webhook signature invalid"

**Cause**: Webhook secret mismatch or replay attack.

**Solutions**:
1. Verify webhook secret matches provider dashboard:
   - `STRIPE_WEBHOOK_SECRET`
   - `PLAID_WEBHOOK_SECRET` (derived from secret)
   - `PERSONA_WEBHOOK_SECRET`
2. Check system clock synchronization

---

## Performance Issues

### "Slow page loads"

**Solutions**:
1. Enable caching headers (automatic in production)
2. Check database query performance:
   ```bash
   npx prisma studio  # Review slow queries
   ```
3. Optimize large document lists with pagination

### "Memory exceeded"

**Cause**: Large file processing or memory leaks.

**Solutions**:
1. Use streaming for large file uploads (TUS protocol)
2. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
3. Check for unclosed database connections

---

## External Service Issues

### Plaid Sandbox Testing

| Error | Solution |
|-------|----------|
| "Invalid credentials" | Use `user_good` / `pass_good` |
| "Institution not found" | Use `ins_109508` (First Platypus Bank) |
| "Webhook not received" | Check `PLAID_WEBHOOK_URL` is publicly accessible |

### Persona Sandbox Testing

| Error | Solution |
|-------|----------|
| "Inquiry not found" | Ensure `PERSONA_ENVIRONMENT=sandbox` |
| "Template not configured" | Set `PERSONA_TEMPLATE_ID` from dashboard |
| "Verification failed" | Use test SSN `111-11-1111` for auto-approval |

### Stripe Test Mode

| Error | Solution |
|-------|----------|
| "Invalid API key" | Ensure using `sk_test_*` prefix keys |
| "Card declined" | Use test card `4242424242424242` |
| "Webhook failed" | Verify `STRIPE_WEBHOOK_SECRET` |

---

## Docker Issues

### "Container health check failed"

**Cause**: Application not ready or health endpoint missing.

**Solutions**:
1. Verify `/api/health` endpoint exists and returns 200
2. Increase health check `start_period` in docker-compose.yml
3. Check container logs: `docker logs bf-fund-app`

### "Database connection refused in container"

**Cause**: App starting before database is ready.

**Solutions**:
1. Use `depends_on` with `condition: service_healthy`
2. Increase `healthcheck.retries` for database
3. Add startup delay in entrypoint script

---

## Recent Issues & Fixes (January 2026)

### Service Worker Registration Failed in Production

**Error**: "The script resource is behind a redirect, which is disallowed."

**Cause**: Middleware was intercepting `sw.js` requests and redirecting them.

**Solution**: Updated `proxy.ts` middleware matcher to exclude service worker files:
```typescript
matcher: [
  "/((?!api/|_next/|_static|vendor|_icons|_vercel|favicon.ico|favicon.png|sitemap.xml|sw.js|sw-version.json|manifest.json|offline).*)",
]
```

### Magic Link 404 Error After Clicking Email Link

**Error**: 404 on `/verify` page when clicking magic link.

**Cause**: Checksum mismatch due to `NEXT_PRIVATE_VERIFICATION_SECRET` being different between email generation and verification.

**Solution**: 
1. Remove duplicate env vars that conflict with secrets
2. Set `NEXT_PRIVATE_VERIFICATION_SECRET` in the "shared" environment so both development and production use the same value
3. Ensure no secret with the same name has a different value

### Rollbar "access token not found" Error

**Error**: "access token not found: [hex string] please check that the access token exists"

**Cause**: Using the Rollbar "Public ID" instead of an actual access token.

**Solution**:
1. Go to Rollbar Dashboard > Project Settings > Project Access Tokens
2. Use a token with "post_client_item" scope (NOT the Public ID)
3. Public IDs are ~32 hex characters but are NOT tokens

### User Not Receiving Magic Link Email

**Cause**: User email not authorized in the system.

**Solution**: Before sending magic links, the system now checks if the user is:
- An admin (listed in admin emails)
- A viewer record (in database)
- A member of a viewer group
- On a link's allowList

If not authorized, they see a "Request Access" message instead of receiving an email.

### Next.js Deprecation Warning About Middleware

**Warning**: "middleware.ts is deprecated, use proxy.ts instead"

**Solution**: Rename `middleware.ts` to `proxy.ts`. Next.js 16 uses the new naming convention.

---

## Getting Help

1. **Check logs**: `npm run dev` console, browser DevTools, or Docker logs
2. **Search docs**: `docs/` folder contains detailed guides
3. **Review tests**: `__tests__/` folder shows expected behavior
4. **Contact support**: investors@bermudafranchisegroup.com
