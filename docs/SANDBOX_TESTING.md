# Sandbox & Testing Guide

This guide covers how to configure external service dependencies for development and testing without production API keys.

## Quick Start - Development Mode

For local development without external services, set these environment variables:

```bash
# Use sandbox/test mode for all services
PLAID_ENV=sandbox
PERSONA_ENVIRONMENT=sandbox
STORAGE_PROVIDER=local

# Optional: Skip external service calls entirely
MOCK_EXTERNAL_SERVICES=true
SKIP_KYC_VERIFICATION=true
```

---

## Service-Specific Configuration

### Plaid (Bank Connectivity)

Plaid provides a sandbox environment for testing bank linking without real accounts.

**Environment Variables:**
```bash
PLAID_ENV=sandbox                    # Options: sandbox, development, production
PLAID_CLIENT_ID=your_client_id       # From Plaid dashboard
PLAID_SECRET=your_sandbox_secret     # Use sandbox secret in sandbox mode
PLAID_WEBHOOK_URL=https://your-domain.com/api/webhooks/plaid
```

**Sandbox Testing:**
- Get sandbox credentials from [Plaid Dashboard](https://dashboard.plaid.com/)
- Use test credentials: `user_good` / `pass_good` for successful flows
- Test institutions: `ins_109508` (First Platypus Bank), `ins_109509` (Houndstooth Bank)

**Test Credentials for Sandbox:**
| Username | Password | Result |
|----------|----------|--------|
| `user_good` | `pass_good` | Successful link |
| `user_bad` | `pass_bad` | Failed credentials |
| `user_locked` | `locked_out` | Account locked |

**Webhook Testing:**
Use [Plaid Sandbox Webhooks](https://plaid.com/docs/sandbox/webhooks/) to simulate events:
```bash
curl -X POST https://sandbox.plaid.com/sandbox/item/fire_webhook \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "secret": "YOUR_SANDBOX_SECRET",
    "access_token": "YOUR_ACCESS_TOKEN",
    "webhook_code": "DEFAULT_UPDATE"
  }'
```

---

### Persona (KYC/AML Verification)

Persona provides sandbox mode for testing identity verification flows.

**Environment Variables:**
```bash
PERSONA_API_KEY=your_sandbox_api_key
PERSONA_TEMPLATE_ID=your_template_id
PERSONA_ENVIRONMENT_ID=your_environment_id
PERSONA_ENVIRONMENT=sandbox           # Options: sandbox, production
PERSONA_WEBHOOK_SECRET=your_webhook_secret
```

**Sandbox Testing:**
- Get sandbox credentials from [Persona Dashboard](https://withpersona.com/dashboard)
- In sandbox mode, use test SSNs and documents
- Persona automatically approves certain test patterns

**Test Data for Sandbox:**
| Test Case | SSN Pattern | Result |
|-----------|-------------|--------|
| Approved | `111-11-1111` | Inquiry approved |
| Declined | `666-66-6666` | Inquiry declined |
| Needs Review | `999-99-9999` | Manual review required |

**Webhook Testing:**
Persona webhooks can be simulated from the dashboard or using curl:
```bash
curl -X POST https://your-domain.com/api/webhooks/persona \
  -H "Content-Type: application/json" \
  -H "Persona-Signature: YOUR_SIGNATURE" \
  -d '{
    "data": {
      "type": "event",
      "id": "evt_xxx",
      "attributes": {
        "name": "inquiry.completed",
        "payload": {
          "data": {
            "type": "inquiry",
            "id": "inq_xxx",
            "attributes": {
              "status": "completed",
              "reference-id": "investor_123"
            }
          }
        }
      }
    }
  }'
```

---

### Stripe (Payment Processing)

Stripe provides test mode for all payment flows.

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_xxx        # Use test key (starts with sk_test_)
STRIPE_PUBLISHABLE_KEY=pk_test_xxx   # Use test key (starts with pk_test_)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Test Cards:**
| Card Number | Result |
|-------------|--------|
| `4242424242424242` | Successful payment |
| `4000000000000002` | Declined |
| `4000000000009995` | Insufficient funds |

**Webhook Testing:**
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

---

### Resend (Email)

**Environment Variables:**
```bash
RESEND_API_KEY=re_xxx
```

**Testing Without Real Emails:**
- Use Resend's test mode or a test API key
- Emails to `@resend.dev` domains are sandboxed
- Check [Resend Dashboard](https://resend.com/emails) for sent emails

---

### Storage (Multi-Provider)

For local development without cloud storage:

**Environment Variables:**
```bash
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./.storage
STORAGE_ENCRYPTION_KEY=your_64_char_hex_key_for_aes256_encryption_32bytes
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Mock Services for Testing

The platform includes support for mock services when `MOCK_EXTERNAL_SERVICES=true`:

### Mock Plaid
- Link tokens return immediately
- Public token exchange returns mock access tokens
- Account balances return test data

### Mock Persona
- Inquiry creation returns mock inquiry IDs
- Status checks return configurable states
- Set `SKIP_KYC_VERIFICATION=true` to bypass KYC gates entirely

### Running Tests
```bash
# Run all tests with mocks
MOCK_EXTERNAL_SERVICES=true npm test

# Run specific test suites
npm run test:unit
npm run test:e2e
```

---

## Webhook Endpoint Security

All webhook endpoints implement:

1. **Signature Verification**: HMAC or JWT-based signature validation
2. **Idempotency**: Duplicate event detection
3. **Rate Limiting**: Protection against webhook floods
4. **Error Handling**: Graceful failures with retry guidance

### Webhook Endpoints:

| Service | Endpoint | Verification |
|---------|----------|--------------|
| Plaid | `/api/webhooks/plaid` | JWT (Plaid-Verification header) |
| Persona | `/api/webhooks/persona` | HMAC (Persona-Signature header) |
| Stripe | `/api/webhooks/stripe` | HMAC (Stripe-Signature header) |

---

## Privacy Notices

When implementing external service integrations, ensure proper privacy notices:

### Bank Linking (Plaid)
- Inform users their bank credentials are processed by Plaid
- Link to Plaid's privacy policy
- Explain what data is collected (account info, balances)

### Identity Verification (Persona)
- Explain ID document and selfie collection
- Link to Persona's privacy policy
- Describe data retention policies

### Recommended Implementation:
```typescript
// Display before external service flow
const PrivacyNotice = ({ service }: { service: 'plaid' | 'persona' }) => (
  <div className="text-sm text-muted-foreground">
    {service === 'plaid' && (
      <p>
        Bank connectivity is provided by Plaid. By continuing, you agree to 
        Plaid's <a href="https://plaid.com/legal/">Terms of Service</a> and 
        <a href="https://plaid.com/legal/#end-user-privacy-policy">Privacy Policy</a>.
      </p>
    )}
    {service === 'persona' && (
      <p>
        Identity verification is provided by Persona. Your ID and selfie will be 
        processed according to Persona's <a href="https://withpersona.com/legal/privacy-policy">Privacy Policy</a>.
      </p>
    )}
  </div>
);
```

---

## Troubleshooting

### Common Issues

**Plaid Link Not Opening:**
- Check CSP allows `*.plaid.com` and `*.cdn.plaid.com`
- Verify PLAID_CLIENT_ID and PLAID_SECRET are set
- Ensure PLAID_ENV matches your credentials (sandbox vs production)

**Persona Iframe Issues:**
- Check CSP allows `*.withpersona.com`
- Verify PERSONA_ENVIRONMENT_ID is correct
- For mobile, ensure viewport meta tag is properly set

**Webhook Signature Failures:**
- Ensure raw body is used for signature verification (not parsed JSON)
- Check webhook secret matches dashboard configuration
- Verify system clocks are synchronized

### Debug Mode
Enable verbose logging:
```bash
DEBUG_WEBHOOKS=true
```

This logs:
- Incoming webhook payloads
- Signature verification steps
- Processing results
