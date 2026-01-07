# Session Start Checks Runbook

> Run these checks at the start of each development session

## Quick Health Check (Always Do)

### 1. Read Project Context
```bash
# Agent should read replit.md for current project state
cat replit.md
```

### 2. Check Workflow Status
```bash
# Check if dev server is running
# Use refresh_all_logs tool or check workflow status
```

### 3. Review Recent Changes
```bash
# Check recent commits
git log --oneline -10

# Check current branch
git branch --show-current

# Check for uncommitted changes
git status
```

## Development Environment Checks

### TypeScript Compilation
```bash
npx tsc --noEmit
```
Expected: No errors (or known acceptable warnings)

### Prisma Schema Sync
```bash
npx prisma generate --schema=prisma/schema
npx prisma db push --schema=prisma/schema --accept-data-loss=false
```
Expected: "Your database is now in sync"

### Workflow Logs Check
Look for in logs:
- "Ready in Xms" = Server started successfully
- No red error messages
- No unhandled promise rejections

## Production Environment Checks

### Verify Production URL
```
https://dataroom.bermudafranchisegroup.com
```

Check:
- [ ] Login page loads
- [ ] BF Fund branding visible
- [ ] No console errors

### Database Schema Parity
Ensure dev and prod databases have same schema version.

## Common Issues & Fixes

### Issue: "Cannot find module" Error
```bash
rm -rf .next
npm run dev
```

### Issue: Prisma Client Outdated
```bash
npx prisma generate --schema=prisma/schema
```

### Issue: Port 5000 Already in Use
```bash
# Find and kill process
lsof -i :5000
kill -9 <PID>
```

### Issue: Database Connection Failed
Check DATABASE_URL environment variable is set correctly.

## Escalation Triggers

Escalate to user if:
- Production site is down
- Database migration failed with data loss risk
- Authentication system not working (magic links, session bypass, OTP)
- More than 5 TypeScript errors in core files

## Authentication System Health Check

### One-Click Access Verification
The platform uses session-based authentication bypass. Key file: `app/api/views-dataroom/route.ts`

Check these conditions are working:
1. **NextAuth Session Detection** - `getServerSession(authOptions)` returns valid session
2. **Access Verification** - Group membership, allowList, or team viewer status checked
3. **OTP Bypass** - `isEmailVerified = true` when session + access verified

### Test Scenarios
| User State | emailAuthenticated | Expected Behavior |
|------------|-------------------|-------------------|
| Has session + access | OFF | One-click access |
| Has session + access | ON | One-click access |
| No session | OFF | Email collected, no OTP |
| No session | ON | OTP required |

## Session End Checklist

Before ending session:
- [ ] All changes committed
- [ ] Workflow running successfully
- [ ] replit.md updated with any new decisions
- [ ] No broken features introduced
