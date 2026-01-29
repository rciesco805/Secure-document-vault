# BF Fund Investor Dataroom - API Documentation

## Overview

This document provides comprehensive API documentation for the BF Fund Investor Dataroom platform. All API endpoints are RESTful and return JSON responses.

**Base URL:** Your Replit deployment URL (e.g., `https://your-app.replit.app`)

---

## Authentication

### Admin Authentication
Admin users authenticate via:
- **Email Magic Link**: POST `/api/auth/admin-magic-verify`
- **Google OAuth**: Via NextAuth.js at `/api/auth/[...nextauth]`

### LP (Investor) Authentication
Investors authenticate via email magic links sent during registration.

### Session Requirements
Most API endpoints require an authenticated session. Include cookies from the NextAuth.js session.

### Role-Based Access
- **GP Role**: Full access to fund management, investor data, and admin functions
- **LP Role**: Access to personal investment data, documents, and portal features

---

## E-Signature APIs

### Sign Document
**POST** `/api/sign/[token]`

Submit a signature for a document. Includes ESIGN Act / UETA compliance with consent capture.

**Request Body:**
```json
{
  "signatureData": "data:image/png;base64,...",
  "fields": [
    {
      "id": "field_123",
      "type": "signature",
      "value": "data:image/png;base64,..."
    },
    {
      "id": "field_456",
      "type": "text",
      "value": "John Doe"
    }
  ],
  "consent": {
    "agreed": true,
    "version": "1.0",
    "timestamp": "2026-01-25T12:00:00Z"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document signed successfully",
  "documentId": "doc_abc123",
  "checksum": "sha256:abc123..."
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 400 | Missing required fields or invalid signature data |
| 401 | Invalid or expired token |
| 403 | Document already signed or consent not provided |
| 404 | Document not found |

---

### Verify Signature
**GET** `/api/sign/verify/[token]`

Verify the integrity and compliance of a signed document. Rate limited to 10 requests per minute.

**Response (200):**
```json
{
  "valid": true,
  "document": {
    "id": "doc_abc123",
    "name": "Subscription Agreement",
    "signedAt": "2026-01-25T12:00:00Z"
  },
  "signer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "compliance": {
    "esignActCompliant": true,
    "uetaCompliant": true,
    "consentCaptured": true,
    "checksumValid": true,
    "checksum": "sha256:abc123..."
  },
  "auditTrail": {
    "createdAt": "2026-01-24T10:00:00Z",
    "sentAt": "2026-01-24T10:05:00Z",
    "viewedAt": "2026-01-25T11:55:00Z",
    "signedAt": "2026-01-25T12:00:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 404 | Document or signature not found |
| 429 | Rate limit exceeded |

---

### Get Signature Audit Trail
**GET** `/api/teams/[teamId]/signature-audit/export`

Export signature audit data for compliance reporting.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | `json` (default), `csv`, or `pdf` (HTML report) |
| event | string | Filter by event type |
| startDate | string | ISO date for range start |
| endDate | string | ISO date for range end |

**Response (200 - JSON):**
```json
{
  "auditLogs": [
    {
      "id": "aud_123",
      "documentId": "doc_456",
      "documentTitle": "Subscription Agreement",
      "recipientEmail": "investor@example.com",
      "event": "DOCUMENT_SIGNED",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "geoLocation": "New York, US",
      "createdAt": "2026-01-25T12:00:00Z"
    }
  ],
  "totalCount": 150,
  "exportedAt": "2026-01-25T14:00:00Z"
}
```

**Event Types:**
- `SIGNATURE_REQUEST` - Signature request sent
- `DOCUMENT_VIEWED` - Document viewed by recipient
- `DOCUMENT_SIGNED` - Document signed
- `SIGNATURE_DECLINED` - Signature declined
- `SIGNATURE_CANCELLED` - Request cancelled

---

## Transaction APIs (with KYC/AML Enforcement)

### Create Transaction
**POST** `/api/transactions`

Initiate a capital call or distribution transfer.

**Prerequisites:**
1. GP role authentication
2. Investor KYC verification (status must be `APPROVED` or `VERIFIED`)
3. AML screening pass (risk score < 70)

**Request Body:**
```json
{
  "type": "CAPITAL_CALL",
  "investorId": "inv_456",
  "fundId": "fund_789",
  "amount": 50000,
  "description": "Q1 2026 Capital Call",
  "bankLinkId": "bank_123",
  "capitalCallId": "cc_789"
}
```

**Response (201):**
```json
{
  "success": true,
  "transaction": {
    "id": "txn_abc123",
    "type": "CAPITAL_CALL",
    "amount": "50000",
    "status": "PENDING"
  }
}
```

**Error Codes:**
| Code | Error Code | Description |
|------|------------|-------------|
| 400 | - | Invalid transaction type or missing fields |
| 403 | KYC_REQUIRED | Investor KYC not verified |
| 403 | AML_BLOCKED | Transaction blocked by AML screening |
| 404 | - | Investor not found |

**AML Screening Response (403):**
```json
{
  "message": "Transaction blocked by compliance screening",
  "code": "AML_BLOCKED",
  "reason": "Transaction requires manual compliance review due to elevated risk indicators"
}
```

---

### Get Transactions
**GET** `/api/transactions`

List transactions with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Max results (default: 25) |
| offset | number | Pagination offset |
| type | string | `CAPITAL_CALL` or `DISTRIBUTION` |
| status | string | Transaction status filter |
| fundId | string | Filter by fund |
| direction | string | `inbound` or `outbound` |

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "txn_123",
      "type": "CAPITAL_CALL",
      "direction": "inbound",
      "amount": "50000",
      "currency": "USD",
      "status": "COMPLETED",
      "investor": {
        "id": "inv_456",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "bankAccount": "Chase ••••1234",
      "createdAt": "2026-01-25T12:00:00Z"
    }
  ],
  "total": 150,
  "hasMore": true,
  "summary": [...]
}
```

---

### AML Screening Rules

Transactions are automatically screened against these thresholds:

| Rule | Threshold | Risk Score |
|------|-----------|------------|
| Single Transaction | > $100,000 | +30 |
| Daily Cumulative | > $250,000 | +40 |
| High Velocity | 5+ transactions in 24 hours | +25 |

**Blocking Threshold:** Risk score >= 70 triggers manual review requirement.

All screenings are logged to the audit trail with:
- Risk score
- Triggered flags
- Daily transaction total
- Transaction count
- Pass/block result

---

## LP Portal APIs

### Get Investor Profile
**GET** `/api/lp/me`

Get current investor's profile and status.

**Response (200):**
```json
{
  "investor": {
    "id": "inv_123",
    "entityName": "John Doe LLC",
    "ndaSigned": true,
    "ndaSignedAt": "2026-01-20T10:00:00Z",
    "accreditationStatus": "VERIFIED",
    "kycStatus": "APPROVED",
    "kycVerifiedAt": "2026-01-21T14:00:00Z",
    "totalCommitment": 500000,
    "totalFunded": 125000
  },
  "capitalCalls": [...],
  "fundAggregates": [...],
  "gateProgress": {
    "ndaCompleted": true,
    "accreditationCompleted": true,
    "completionPercentage": 100
  }
}
```

---

### Get Fund Details
**GET** `/api/lp/fund-details`

Get investor's fund investments with real-time data.

**Response (200):**
```json
{
  "summary": {
    "totalCommitment": 500000,
    "totalFunded": 125000,
    "totalDistributions": 25000,
    "activeFunds": 2,
    "pendingCapitalCallsCount": 1,
    "pendingCapitalCallsTotal": 50000
  },
  "funds": [...],
  "pendingCapitalCalls": [...],
  "recentTransactions": [...],
  "documents": [...],
  "notes": [...],
  "lastUpdated": "2026-01-25T12:00:00Z"
}
```

---

### Get Wizard Progress
**GET** `/api/lp/wizard-progress`

Track onboarding progress through 7 steps.

**Response (200):**
```json
{
  "steps": {
    "accountCreated": { "completed": true, "completedAt": "2026-01-15T10:00:00Z" },
    "ndaSigned": { "completed": true, "completedAt": "2026-01-16T11:00:00Z", "required": true },
    "accreditationStarted": { "completed": true },
    "accreditationCompleted": { "completed": true, "details": {...} },
    "kycVerified": { "completed": true, "status": "APPROVED", "required": true },
    "bankLinked": { "completed": true, "count": 1 },
    "subscribed": { "completed": false, "count": 0 }
  },
  "progress": {
    "completed": 6,
    "total": 7,
    "percentage": 86
  },
  "currentStep": "SUBSCRIPTION",
  "onboardingStatus": "IN_PROGRESS"
}
```

**Prerequisites Enforcement:**
- NDA must be signed before Accreditation
- Accreditation must be completed before KYC
- KYC must be approved before completing onboarding

---

### Bank Account APIs

#### Get Bank Status
**GET** `/api/lp/bank/status`

**Response (200):**
```json
{
  "configured": true,
  "hasBankLink": true,
  "bankLink": {
    "institutionName": "Chase",
    "accountName": "Checking",
    "accountMask": "1234",
    "accountType": "depository"
  }
}
```

#### Connect Bank Account
**POST** `/api/lp/bank/connect`

Connect bank via Plaid Link.

**Request Body:**
```json
{
  "publicToken": "public-sandbox-xxx",
  "accountId": "account_123",
  "metadata": {
    "institution": { "name": "Chase" }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "requiresKyc": false,
  "bankLink": {
    "id": "bl_123",
    "institutionName": "Chase",
    "accountName": "Checking",
    "accountMask": "1234",
    "accountType": "depository"
  }
}
```

---

### KYC APIs

#### Get KYC Status
**GET** `/api/lp/kyc`

**Response (200):**
```json
{
  "configured": true,
  "status": "APPROVED",
  "inquiryId": "inq_abc123",
  "verifiedAt": "2026-01-21T14:00:00Z",
  "environmentId": "env_production",
  "templateId": "tmpl_kyc_standard"
}
```

**Status Values:**
- `NOT_STARTED` - KYC not initiated
- `PENDING` - Inquiry in progress
- `APPROVED` - Verification passed
- `VERIFIED` - Verification confirmed
- `FAILED` - Verification failed
- `DECLINED` - Manually declined

#### Start/Resume KYC
**POST** `/api/lp/kyc`

**Request Body:**
```json
{
  "action": "start"
}
```

**Response (200):**
```json
{
  "action": "start",
  "inquiryId": "inq_abc123",
  "sessionToken": "session_xyz",
  "environmentId": "env_production"
}
```

---

## Admin/GP APIs

### AUM Reporting
**GET** `/api/admin/reports/aum`

Get Assets Under Management report with fee calculations.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| fundId | string | Required - Fund ID |
| asOfDate | string | ISO date (default: today) |

**Response (200):**
```json
{
  "fund": {
    "id": "fund_789",
    "name": "BF Growth Fund I"
  },
  "asOfDate": "2026-01-25",
  "aum": {
    "grossAUM": 50000000,
    "netAUM": 48500000,
    "nav": 47000000
  },
  "fees": {
    "managementFee": 1000000,
    "performanceFee": 500000,
    "organizationalExpenses": 150000,
    "otherExpenses": 50000,
    "totalDeductions": 1700000
  },
  "ratios": {
    "expenseRatio": 0.034,
    "netToGrossRatio": 0.97
  },
  "breakdown": {
    "byInvestor": [...],
    "byVintage": [...]
  }
}
```

---

### Capital Tracking
**GET** `/api/admin/capital-tracking`

Get comprehensive capital metrics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| fundId | string | Required - Fund ID |

**Response (200):**
```json
{
  "summary": {
    "totalCommitments": 75000000,
    "calledCapital": 50000000,
    "uncalledCapital": 25000000,
    "distributions": 12000000,
    "netInvested": 38000000
  },
  "investors": [
    {
      "id": "inv_123",
      "name": "John Doe LLC",
      "commitment": 500000,
      "called": 250000,
      "distributed": 50000,
      "percentCalled": 50
    }
  ],
  "charts": {
    "capitalCallHistory": [...],
    "distributionHistory": [...]
  }
}
```

---

### Bulk Action API
**POST** `/api/admin/bulk-action`

Process bulk capital calls or distributions.

**Request Body:**
```json
{
  "type": "CAPITAL_CALL",
  "fundId": "fund_789",
  "allocations": [
    { "investorId": "inv_123", "amount": 50000 },
    { "investorId": "inv_456", "amount": 75000 }
  ],
  "dueDate": "2026-02-15",
  "purpose": "Q1 2026 Capital Call",
  "allocationMode": "PERCENTAGE",
  "percentage": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "results": {
    "successful": ["inv_123", "inv_456"],
    "failed": [],
    "totalProcessed": 2,
    "totalAmount": 125000
  },
  "capitalCallId": "cc_abc123"
}
```

---

### Investor Timeline (CRM)
**GET** `/api/teams/[teamId]/investor-timeline`

Get activity timeline for investors.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| investorId | string | Filter by investor |
| type | string | `view`, `signature`, `document`, `note` |
| search | string | Search term |
| limit | number | Max results (default: 50) |
| format | string | `json` or `csv` |

**Response (200):**
```json
{
  "events": [
    {
      "id": "evt_123",
      "type": "signature",
      "investorId": "inv_456",
      "investorName": "John Doe",
      "description": "Signed Subscription Agreement",
      "metadata": {
        "documentId": "doc_789",
        "documentName": "Subscription Agreement"
      },
      "timestamp": "2026-01-25T12:00:00Z"
    }
  ],
  "total": 150
}
```

---

## Data Portability API

### Export All Data
**GET/POST** `/api/admin/export`

Export comprehensive data for compliance, migration, or backup.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| teamId | string | Required - Team ID |
| models | string | Comma-separated list of models |
| format | string | `json` (default) or `csv` |

**Available Models (18 total):**

| Category | Models |
|----------|--------|
| Fund Data | `fund`, `fundAggregate`, `investment` |
| Investor Data | `investor`, `accreditationAck`, `bankLink` |
| Transactions | `capitalCall`, `capitalCallResponse`, `distribution`, `transaction`, `subscription` |
| Documents | `fundReport`, `investorNote`, `investorDocument` |
| Compliance Audits | `viewAudit`, `signatureAudit`, `auditLog`, `signatureConsent` |

**Response (200):**
```json
{
  "metadata": {
    "exportedAt": "2026-01-25T12:00:00Z",
    "exportedBy": "admin@example.com",
    "teamId": "team_123",
    "schemaVersion": "1.0.0",
    "modelCounts": {
      "funds": 2,
      "investors": 45,
      "transactions": 230,
      "auditLogs": 1250
    }
  },
  "data": {
    "funds": [...],
    "investors": [...],
    "viewAudits": [...],
    "signatureAudits": [...],
    "auditLogs": [...]
  }
}
```

---

## Webhooks

### Plaid Webhooks
**POST** `/api/webhooks/plaid`

Receives Plaid transfer status updates.

**Verification:**
- JWT signature validation
- Timestamp verification (5-minute window)
- Body hash verification

**Events:**
- `TRANSFER_EVENTS_UPDATE` - Transfer status changed

**Idempotency:** Events are deduplicated by `event_id` to prevent double-processing.

---

### Persona Webhooks
**POST** `/api/webhooks/persona`

Receives KYC inquiry status updates.

**Verification:** Persona signature header validation

**Events:**
- `inquiry.completed` - KYC completed
- `inquiry.approved` - KYC approved
- `inquiry.declined` - KYC declined

---

## Error Handling

### Standard Error Response
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not authorized |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Signature Verification | 10 requests/minute |
| Authentication | 5 attempts/minute |
| API General | 100 requests/minute |

---

## SDK Examples

### Node.js
```javascript
const response = await fetch('https://your-app.replit.app/api/transactions', {
  method: 'POST',
  headers: {
    'Cookie': sessionCookie,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'CAPITAL_CALL',
    investorId: 'inv_123',
    fundId: 'fund_456',
    amount: 50000
  })
});

if (!response.ok) {
  const error = await response.json();
  if (error.code === 'KYC_REQUIRED') {
    console.log('Investor needs KYC verification');
  }
}

const data = await response.json();
```

### Python
```python
import requests

response = requests.post(
    'https://your-app.replit.app/api/transactions',
    json={
        'type': 'CAPITAL_CALL',
        'investorId': 'inv_123',
        'fundId': 'fund_456',
        'amount': 50000
    },
    cookies={'session': session_cookie}
)

if response.status_code == 403:
    error = response.json()
    if error.get('code') == 'AML_BLOCKED':
        print(f"AML block: {error.get('reason')}")
```

---

## Form D Amendment Reminders

### Get Form D Reminders
**GET** `/api/admin/form-d-reminders`

Get all funds with Form D filing information and upcoming amendment deadlines.

**Response (200):**
```json
{
  "reminders": [
    {
      "fundId": "fund_123",
      "fundName": "BF Growth Fund I",
      "formDFilingDate": "2025-02-01T00:00:00Z",
      "amendmentDue": "2026-02-01T00:00:00Z",
      "daysUntilDue": 17,
      "urgency": "WARNING",
      "reminderSent": false,
      "stateNotices": [
        { "state": "CA", "filed": true, "filedAt": "2025-02-05" },
        { "state": "NY", "filed": false, "dueDate": "2025-03-01" }
      ],
      "status": "RAISING"
    }
  ],
  "upcomingCount": 2,
  "overdueCount": 0
}
```

**Urgency Levels:**
| Level | Days Until Due |
|-------|----------------|
| OVERDUE | <= 0 |
| CRITICAL | 1-7 |
| WARNING | 8-30 |
| OK | > 30 |

---

### Send Form D Reminder
**POST** `/api/admin/form-d-reminders`

Send reminder emails or check all funds for upcoming deadlines.

**Request Body (Send Single):**
```json
{
  "action": "send_reminder",
  "fundId": "fund_123"
}
```

**Request Body (Check All):**
```json
{
  "action": "check_all"
}
```

**Request Body (Update Filing):**
```json
{
  "action": "update_filing",
  "fundId": "fund_123",
  "formDFilingDate": "2025-02-01",
  "formDAmendmentDue": "2026-02-01"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reminder sent to 2 admin(s)"
}
```

---

## LP Statement Generation

### Get LP Statement
**GET** `/api/lp/statement`

Generate a capital account statement for the authenticated LP. Returns JSON data or a print-ready HTML page that can be saved as PDF using the browser's "Print to PDF" function.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | Q1, Q2, Q3, Q4, or annual (default: annual) |
| year | number | Statement year (default: current year) |
| format | string | json or html (default: json) |

**Response (200 - JSON):**
```json
{
  "investor": {
    "name": "Smith Family Trust",
    "entityType": "TRUST",
    "id": "investor_123",
    "email": "investor@example.com"
  },
  "fund": {
    "name": "BF Growth Fund I",
    "status": "RAISING",
    "targetRaise": 10000000,
    "currentRaise": 5000000
  },
  "period": {
    "type": "Q1",
    "year": 2026,
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2026-03-31T23:59:59Z"
  },
  "capitalAccount": {
    "totalCommitment": 500000,
    "totalFunded": 250000,
    "unfundedCommitment": 250000,
    "netCapitalAccount": 225000,
    "ownershipPercentage": "5.00"
  },
  "periodActivity": {
    "capitalCalls": 100000,
    "distributions": 25000,
    "netActivity": 75000,
    "transactionCount": 5
  },
  "transactions": [...],
  "bankAccount": {
    "institution": "Chase",
    "accountName": "Business Checking",
    "lastFour": "4567"
  },
  "k1Status": {
    "available": false,
    "year": 2026,
    "estimatedDate": "2027-03-15T00:00:00Z"
  },
  "generatedAt": "2026-01-25T12:00:00Z",
  "statementId": "STMT-STOR123-2026-Q1"
}
```

**HTML Format:**
Add `?format=html` to get a print-ready HTML statement.

---

## Waterfall Distribution

### Get Waterfall Data
**GET** `/api/admin/waterfall`

Get waterfall distribution calculations for funds.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| fundId | string | Optional - filter to specific fund |

**Response (200):**
```json
{
  "funds": [
    {
      "fundId": "fund_123",
      "fundName": "BF Growth Fund I",
      "status": "RAISING",
      "config": {
        "preferredReturn": 8,
        "carriedInterest": 20,
        "catchUpPercentage": 100,
        "hurdleRate": 0
      },
      "summary": {
        "totalCapitalContributed": 10000000,
        "totalProceeds": 15000000,
        "totalLP": 12500000,
        "totalGP": 2500000,
        "lpMultiple": 1.25,
        "lpSharePercentage": 83.33,
        "gpSharePercentage": 16.67
      },
      "tiers": [
        {
          "name": "Return of Capital",
          "type": "return_of_capital",
          "lpShare": 100,
          "gpShare": 0,
          "amount": 10000000,
          "lpAmount": 10000000,
          "gpAmount": 0
        },
        {
          "name": "Preferred Return (8%)",
          "type": "preferred_return",
          "lpShare": 100,
          "gpShare": 0,
          "amount": 800000,
          "lpAmount": 800000,
          "gpAmount": 0
        },
        {
          "name": "GP Catch-Up",
          "type": "catch_up",
          "lpShare": 0,
          "gpShare": 100,
          "amount": 2700000,
          "lpAmount": 0,
          "gpAmount": 2700000
        },
        {
          "name": "Carried Interest (80/20)",
          "type": "carried_interest",
          "lpShare": 80,
          "gpShare": 20,
          "amount": 1500000,
          "lpAmount": 1200000,
          "gpAmount": 300000
        }
      ],
      "investorBreakdown": [
        {
          "investorId": "inv_123",
          "investorName": "Smith Family Trust",
          "capitalContributed": 500000,
          "commitment": 500000,
          "ownershipPercentage": 5.0,
          "estimatedDistribution": 625000,
          "returnOfCapital": 500000,
          "preferredReturn": 40000,
          "profitShare": 85000,
          "multiple": 1.25
        }
      ]
    }
  ],
  "generatedAt": "2026-01-25T12:00:00Z"
}
```

**Waterfall Tiers:**
| Tier | LP Share | GP Share | Description |
|------|----------|----------|-------------|
| Return of Capital | 100% | 0% | LPs receive all capital back first |
| Preferred Return | 100% | 0% | 8% annual preferred return to LPs |
| GP Catch-Up | 0% | 100% | GP receives catch-up to target carry |
| Carried Interest | 80% | 20% | Remaining profits split 80/20 |

---

## Error Monitoring

### Test Error Endpoint
**GET** `/api/test-error`

Trigger a test error to verify Rollbar integration is working correctly.

**Response (200):**
```json
{
  "success": true,
  "message": "Test error sent to Rollbar",
  "timestamp": "2026-01-25T12:00:00Z"
}
```

**Notes:**
- Requires `ROLLBAR_SERVER_TOKEN` environment variable to be configured
- Use this endpoint to verify error monitoring is properly connected
- Test errors appear in your Rollbar dashboard under "test-error-route" source

### Error Capture Configuration

The platform captures errors at multiple levels:

| Level | Component | Description |
|-------|-----------|-------------|
| **Client-side** | `app/providers.tsx` | Captures browser errors via Rollbar client |
| **Route-level** | `app/error.tsx` | Catches and reports route-specific errors |
| **Global** | `app/global-error.tsx` | Catches unhandled application errors |
| **Server-side** | `proxy.ts` | Captures middleware/API errors with context |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN` | Yes | Client-side error tracking token |
| `ROLLBAR_SERVER_TOKEN` | Yes | Server-side error tracking token |

---

## Changelog

| Date | Changes |
|------|---------|
| January 2026 | Phase 1 100% complete: Form D reminders, LP statements, waterfall visualization, KYC post-bank enforcement, AML screening, Quick Actions CTAs, bulk action wizard, audit dashboard, PWA support, Rollbar error monitoring |
| December 2025 | Added Plaid transfer APIs, wizard progress tracking, entity fee/tier configuration |
| November 2025 | Initial e-signature APIs, LP portal endpoints, signature verification |

---

## Testing

The API has comprehensive test coverage:

- **1,584+ passing tests** covering all endpoints
- **Phase 1 Completion Tests**: 41 tests for Form D, LP statements, waterfall
- **KYC Enforcement Tests**: 6 tests for transaction blocking
- **AML Screening Tests**: 8 tests for threshold validation
- **Bulk Action Tests**: 35 tests for wizard functionality
- **Audit Dashboard Tests**: 45 tests for filtering/export
- **PWA Tests**: 30 tests for offline/install features

Run tests: `npm test` or `npx jest`
