# Persona KYC/AML and Sanctions Screening

## Overview

BF Fund Dataroom integrates with Persona for comprehensive identity verification. Persona offers KYC/AML verification with optional watchlist and sanctions screening capabilities.

> **Note**: The specific watchlists and screening features available depend on your Persona plan and template configuration. Contact Persona support or review your Persona Dashboard to confirm which features are enabled for your account.

## Sanctions Screening

Persona's watchlist screening capabilities (when enabled in your template) may include:

### OFAC Screening
- **Office of Foreign Assets Control (OFAC)** sanctions list check
- SDN (Specially Designated Nationals) list screening
- Verification occurs during inquiry processing

### Configurable Watchlists
Persona can screen against various watchlists depending on your configuration:
- OFAC SDN List (US)
- OFAC Consolidated Sanctions List
- Additional international watchlists (varies by plan)

### PEP Screening (If Enabled)
- **Politically Exposed Persons (PEP)** detection
- Available as an optional verification in Persona templates
- Check your template configuration to confirm PEP screening is enabled

## Verification Flow

```
1. Investor completes NDA signature
   ↓
2. Investor completes accreditation self-certification
   ↓
3. Investor starts Persona KYC flow (iframe embed)
   ↓
4. Persona performs:
   - Document verification (ID/passport)
   - Liveness check (selfie verification)
   - Database verification
   - Sanctions screening (automatic)
   - PEP screening (automatic)
   ↓
5. Persona returns inquiry status:
   - APPROVED: All checks passed
   - NEEDS_REVIEW: Manual review required
   - DECLINED: Failed verification or sanctions hit
   ↓
6. System updates investor.personaStatus
   ↓
7. Investor can proceed to subscription (if APPROVED)
```

## Status Mapping

| Persona Status | System Status | Description |
|----------------|---------------|-------------|
| `created` | `PENDING` | Inquiry started, not submitted |
| `pending` | `PENDING` | Submitted, awaiting verification |
| `completed` | `APPROVED` | All checks passed |
| `needs_review` | `NEEDS_REVIEW` | Manual review by GP required |
| `failed` | `FAILED` | Verification failed |
| `declined` | `DECLINED` | Declined by Persona (sanctions hit, etc.) |
| `expired` | `EXPIRED` | Inquiry session expired |

## Sanctions Hit Handling

When Persona detects a potential sanctions match:

1. **Immediate Block**: Inquiry status set to `DECLINED` or `NEEDS_REVIEW`
2. **GP Notification**: Admin dashboard shows flagged investor
3. **No Subscription**: Investor cannot proceed to subscription
4. **Audit Log**: Event recorded with timestamp and details

### False Positive Process

If a sanctions screening returns a false positive:

1. GP reviews the flagged investor in Persona dashboard
2. GP can clear the false positive in Persona
3. Inquiry status updates to `APPROVED` if cleared
4. Investor can then proceed with subscription

## API Endpoints

### Check KYC Status
```
GET /api/lp/kyc
```
Returns current KYC status including sanctions screening result.

### Start/Resume KYC
```
POST /api/lp/kyc
Body: { "action": "start" } or { "action": "resume" }
```
Initiates or resumes Persona verification flow.

### Webhook Handler
```
POST /api/webhooks/persona
```
Receives status updates from Persona (inquiry completed, status changed).

## Configuration

### Environment Variables

```env
PERSONA_API_KEY=persona_sandbox_xxx          # Persona API key
PERSONA_TEMPLATE_ID=tmpl_xxx                 # Inquiry template ID
PERSONA_ENVIRONMENT_ID=env_xxx               # Environment ID (sandbox/production)
```

### Template Configuration (Persona Dashboard)

1. Go to Persona Dashboard → Templates
2. Create or select an inquiry template
3. Enable verifications:
   - Government ID verification
   - Selfie verification
   - Database verification
   - Watchlist screening (OFAC, PEP, etc.)
4. Configure field collection (name, address, SSN/TIN)
5. Copy Template ID to environment variables

## Compliance Notes

### 506(c) Requirements

For SEC Rule 506(c) private placements:
- All investors must be accredited investors
- Issuer must take "reasonable steps" to verify accreditation
- KYC/AML verification supports "reasonable steps" documentation

### Audit Trail

All KYC events are logged with:
- Timestamp
- Investor ID
- Inquiry ID
- Status changes
- IP address
- User agent

### Data Retention

- Persona retains verification data per their retention policy
- System stores:
  - `personaInquiryId`: Link to Persona inquiry
  - `personaStatus`: Current verification status
  - `personaVerifiedAt`: Timestamp of successful verification
  - `personaReferenceId`: Internal reference ID

## Testing

### Sandbox Testing

Use Persona sandbox environment for testing:
- Sandbox API key: `persona_sandbox_xxx`
- Test documents: Use Persona's test document generator
- Test scenarios: Approved, declined, needs_review

### Test Documents

Persona provides test documents and scenarios in their sandbox environment. Refer to [Persona's testing documentation](https://docs.withpersona.com/docs/sandbox-testing) for current test document options and expected outcomes.

## Support

For Persona-related issues:
- Persona Documentation: https://docs.withpersona.com/
- Persona Dashboard: https://app.withpersona.com/
- Support: support@withpersona.com

For platform integration issues:
- Check `/api/lp/kyc` endpoint logs
- Review Persona webhook delivery in Persona Dashboard
- Contact platform support
