# BF Fund Investor Dataroom - API Documentation

## Overview

This document provides comprehensive API documentation for the BF Fund Investor Dataroom platform. All API endpoints are RESTful and return JSON responses.

## Authentication

### Admin Authentication
Admin users authenticate via:
- **Email Magic Link**: POST `/api/auth/admin-magic-verify`
- **Google OAuth**: Via NextAuth.js at `/api/auth/[...nextauth]`

### LP (Investor) Authentication
Investors authenticate via email magic links sent during registration.

### Session Requirements
Most API endpoints require an authenticated session. Include cookies from the NextAuth.js session.

---

## E-Signature APIs

### Sign Document
**POST** `/api/sign/[token]`

Submit a signature for a document.

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
  "documentId": "doc_abc123"
}
```

**Error Codes:**
- `400` - Missing required fields or invalid signature data
- `401` - Invalid or expired token
- `403` - Document already signed or consent not provided
- `404` - Document not found

---

### Verify Signature
**GET** `/api/sign/verify/[token]`

Verify the integrity and compliance of a signed document.

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
    "ipAddress": "192.168.1.1"
  }
}
```

**Error Codes:**
- `404` - Signature not found
- `429` - Rate limit exceeded (max 10 requests per minute)

---

### Get Signature Status
**GET** `/api/sign/status?documentId=[id]`

Check the status of a signature request.

**Response (200):**
```json
{
  "documentId": "doc_abc123",
  "status": "pending",
  "recipients": [
    {
      "email": "investor@example.com",
      "role": "signer",
      "status": "pending",
      "order": 1
    }
  ],
  "createdAt": "2026-01-24T10:00:00Z"
}
```

**Status Values:** `draft`, `pending`, `completed`, `declined`, `expired`

---

## Transaction APIs (Plaid ACH)

### List Transactions
**GET** `/api/transactions`

Retrieve transactions for the authenticated user/fund.

**Query Parameters:**
- `fundId` (required) - Fund identifier
- `type` - Filter by type: `capital_call`, `distribution`
- `status` - Filter by status: `pending`, `processing`, `completed`, `failed`
- `limit` - Max results (default: 50)
- `offset` - Pagination offset

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "txn_123",
      "type": "capital_call",
      "amount": 50000.00,
      "status": "completed",
      "investorId": "inv_456",
      "investorName": "John Doe",
      "fundId": "fund_789",
      "plaidTransferId": "transfer_abc",
      "createdAt": "2026-01-20T10:00:00Z",
      "completedAt": "2026-01-22T14:30:00Z"
    }
  ],
  "total": 25,
  "hasMore": false
}
```

---

### Create Transaction
**POST** `/api/transactions`

Initiate a new ACH transfer (capital call or distribution).

**Request Body:**
```json
{
  "fundId": "fund_789",
  "investorId": "inv_456",
  "type": "capital_call",
  "amount": 50000.00,
  "description": "Q1 2026 Capital Call"
}
```

**Response (201):**
```json
{
  "id": "txn_123",
  "status": "pending",
  "plaidTransferId": "transfer_abc",
  "message": "Transaction initiated successfully"
}
```

**Error Codes:**
- `400` - Invalid amount or missing required fields
- `402` - Insufficient funds (for distributions)
- `403` - User not authorized for this fund
- `404` - Investor or fund not found
- `422` - Bank account not linked

---

### Process Transaction
**POST** `/api/transactions/[id]/process`

Manually process a pending transaction (admin only).

**Response (200):**
```json
{
  "id": "txn_123",
  "status": "processing",
  "message": "Transaction submitted to Plaid"
}
```

---

## Plaid Webhook
**POST** `/api/webhooks/plaid`

Receives Plaid webhook events for transfer status updates.

**Webhook Verification:**
- JWT signature verification using Plaid's public key
- Timestamp validation (within 5 minutes)
- Body hash verification
- Idempotent event processing

**Supported Events:**
- `TRANSFER_EVENTS_UPDATE` - Transfer status changes

---

## AUM Reporting API

### Get AUM Report
**GET** `/api/admin/reports/aum`

Retrieve comprehensive AUM (Assets Under Management) report.

**Query Parameters:**
- `fundId` - Specific fund (optional, returns all if omitted)
- `asOfDate` - Report date (default: today)

**Response (200):**
```json
{
  "asOfDate": "2026-01-25",
  "summary": {
    "grossAum": 50000000.00,
    "netAum": 48500000.00,
    "nav": 48500000.00,
    "totalCommitments": 75000000.00,
    "undrawnCommitments": 25000000.00
  },
  "deductions": {
    "managementFees": 500000.00,
    "performanceFees": 750000.00,
    "organizationalExpenses": 150000.00,
    "otherExpenses": 100000.00,
    "totalDeductions": 1500000.00
  },
  "ratios": {
    "expenseRatio": 0.03,
    "deploymentRatio": 0.67,
    "distributionToCommitment": 0.15
  },
  "funds": [
    {
      "id": "fund_789",
      "name": "BF Growth Fund I",
      "grossAum": 50000000.00,
      "netAum": 48500000.00,
      "investorCount": 45
    }
  ]
}
```

**Authentication:** Admin/GP role required

---

## Capital Tracking API

### Get Capital Tracking Data
**GET** `/api/admin/capital-tracking`

Retrieve capital tracking metrics for a fund.

**Query Parameters:**
- `fundId` (required) - Fund identifier

**Response (200):**
```json
{
  "summary": {
    "totalCommitted": 75000000.00,
    "totalFunded": 50000000.00,
    "totalDistributed": 12000000.00,
    "uncalledCapital": 25000000.00,
    "fundedPercentage": 66.67
  },
  "investors": [
    {
      "id": "inv_456",
      "name": "John Doe",
      "email": "john@example.com",
      "commitment": 1000000.00,
      "called": 666700.00,
      "funded": 666700.00,
      "distributed": 160000.00,
      "uncalled": 333300.00
    }
  ]
}
```

---

## Bulk Action API

### Execute Bulk Action
**POST** `/api/admin/bulk-action`

Execute capital calls or distributions for multiple investors.

**Request Body:**
```json
{
  "fundId": "fund_789",
  "actionType": "capital_call",
  "totalAmount": 5000000.00,
  "allocationType": "pro_rata",
  "selectedInvestors": ["inv_123", "inv_456", "inv_789"]
}
```

**Allocation Types:**
- `equal` - Split equally among selected investors
- `pro_rata` - Allocate proportionally based on commitment

**Response (200):**
```json
{
  "success": true,
  "processed": 3,
  "totalAmount": 5000000.00,
  "transactions": [
    {
      "investorId": "inv_123",
      "amount": 1666666.67,
      "status": "pending"
    }
  ]
}
```

**Error Codes:**
- `400` - Invalid action type or allocation type
- `403` - Not authorized for this fund
- `404` - Fund not found
- `422` - No investors selected or invalid amounts

---

## LP Portal APIs

### Get LP Profile
**GET** `/api/lp/me`

Retrieve the authenticated LP's profile and investments.

**Response (200):**
```json
{
  "investor": {
    "id": "inv_456",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active",
    "accreditationStatus": "verified",
    "kycStatus": "approved"
  },
  "investments": [
    {
      "fundId": "fund_789",
      "fundName": "BF Growth Fund I",
      "commitment": 1000000.00,
      "funded": 666700.00,
      "distributed": 160000.00,
      "units": 1000
    }
  ]
}
```

---

### Get Wizard Progress
**GET** `/api/lp/wizard-progress`

Track onboarding wizard progress with prerequisites validation.

**Response (200):**
```json
{
  "currentStep": 4,
  "totalSteps": 7,
  "steps": [
    { "id": 1, "name": "Account Created", "completed": true },
    { "id": 2, "name": "NDA Signed", "completed": true, "required": true },
    { "id": 3, "name": "Accreditation", "completed": true, "required": true },
    { "id": 4, "name": "KYC Verification", "completed": false, "required": true },
    { "id": 5, "name": "Bank Link", "completed": false },
    { "id": 6, "name": "Subscription", "completed": false },
    { "id": 7, "name": "Complete", "completed": false }
  ],
  "canProceed": true,
  "blockedBy": null
}
```

---

### Submit Accreditation
**POST** `/api/lp/accreditation`

Submit accredited investor self-certification.

**Request Body:**
```json
{
  "verificationType": "income",
  "certifications": [
    { "id": "income_threshold", "checked": true },
    { "id": "net_worth", "checked": true },
    { "id": "professional", "checked": false },
    { "id": "entity_assets", "checked": false }
  ],
  "attestation": true
}
```

**Response (200):**
```json
{
  "success": true,
  "status": "pending_verification"
}
```

---

### Link Bank Account
**POST** `/api/lp/bank/connect`

Exchange Plaid public token for access token and link bank account.

**Request Body:**
```json
{
  "publicToken": "public-sandbox-abc123",
  "accountId": "account_xyz"
}
```

**Response (200):**
```json
{
  "success": true,
  "bankLink": {
    "id": "bl_123",
    "institutionName": "Chase",
    "accountMask": "****1234",
    "accountType": "checking"
  }
}
```

---

### Get Bank Link Token
**GET** `/api/lp/bank/link-token`

Generate a Plaid Link token for bank account connection.

**Response (200):**
```json
{
  "linkToken": "link-sandbox-abc123",
  "expiration": "2026-01-25T13:00:00Z"
}
```

---

## Investor Notes API

### Get Investor Notes
**GET** `/api/admin/investor-notes`

Retrieve notes for investors in a team.

**Query Parameters:**
- `teamId` (required) - Team identifier
- `investorId` - Filter by specific investor

**Response (200):**
```json
{
  "notes": [
    {
      "id": "note_123",
      "investorId": "inv_456",
      "investorName": "John Doe",
      "content": "Question about distribution schedule",
      "type": "question",
      "createdAt": "2026-01-24T10:00:00Z",
      "replies": [
        {
          "id": "reply_789",
          "content": "Distributions are scheduled quarterly.",
          "authorName": "Fund Admin",
          "createdAt": "2026-01-24T14:00:00Z"
        }
      ]
    }
  ]
}
```

---

### Reply to Investor Note
**POST** `/api/admin/investor-notes`

Reply to an investor note (sends email notification).

**Request Body:**
```json
{
  "noteId": "note_123",
  "content": "Thank you for your question. Distributions are scheduled quarterly.",
  "sendEmail": true
}
```

**Response (200):**
```json
{
  "success": true,
  "replyId": "reply_789",
  "emailSent": true
}
```

---

## Entity Configuration API

### Update Entity Config
**PATCH** `/api/admin/entities/[id]/config`

Update fee and tier configuration for an entity.

**Request Body:**
```json
{
  "feeConfig": {
    "managementFee": 0.02,
    "carriedInterest": 0.20,
    "hurdleRate": 0.08,
    "catchUp": 1.0
  },
  "tierConfig": {
    "tiers": [
      { "name": "Standard", "minCommitment": 100000, "discount": 0 },
      { "name": "Preferred", "minCommitment": 500000, "discount": 0.10 },
      { "name": "Anchor", "minCommitment": 1000000, "discount": 0.25 }
    ]
  },
  "customSettings": {
    "allowSidePockets": true,
    "coInvestRights": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "entity": {
    "id": "entity_123",
    "feeConfig": { ... },
    "tierConfig": { ... }
  }
}
```

---

## CRM Timeline API

### Get Investor Timeline
**GET** `/api/teams/[teamId]/investor-timeline`

Retrieve activity timeline for investors.

**Query Parameters:**
- `investorId` - Filter by specific investor
- `type` - Filter by event type: `view`, `signature`, `document`, `note`
- `search` - Search term
- `limit` - Max results (default: 50)
- `format` - `json` (default) or `csv`

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

## Fund Management APIs

### Get Fund Details
**GET** `/api/admin/fund/[id]`

Retrieve detailed fund information including aggregates.

**Response (200):**
```json
{
  "fund": {
    "id": "fund_789",
    "name": "BF Growth Fund I",
    "targetSize": 100000000.00,
    "authorizedAmount": 100000000.00,
    "initialThreshold": 25000000.00,
    "initialThresholdMet": true,
    "closingDate": "2026-06-30",
    "formDFilingDate": "2025-06-15",
    "ndaRequired": true,
    "entityMode": "FUND"
  },
  "aggregate": {
    "totalRaised": 50000000.00,
    "totalDistributed": 12000000.00,
    "totalCommitments": 75000000.00,
    "investorCount": 45
  },
  "pricingTiers": [
    {
      "id": "tier_1",
      "name": "Series A",
      "pricePerUnit": 1000.00,
      "availableUnits": 10000,
      "soldUnits": 5000
    }
  ]
}
```

---

### Update Fund Settings
**PATCH** `/api/funds/[fundId]/settings`

Update fund configuration.

**Request Body:**
```json
{
  "ndaRequired": true,
  "initialThreshold": 25000000.00,
  "formDFilingDate": "2025-06-15"
}
```

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context if applicable"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per IP
- **Signature verification**: 10 requests per minute per IP
- **Bulk operations**: 10 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706190000
```

---

## Webhooks

### Plaid Webhooks
- **Endpoint**: `/api/webhooks/plaid`
- **Verification**: JWT signature + timestamp + body hash
- **Events**: Transfer status updates

### Persona Webhooks
- **Endpoint**: `/api/webhooks/persona`
- **Verification**: Persona signature header
- **Events**: KYC inquiry status changes

### E-Sign Webhooks
- **Endpoint**: `/api/webhooks/esign`
- **Events**: Document signed, viewed, declined

---

## SDK Examples

### Node.js
```javascript
const response = await fetch('https://your-domain.com/api/admin/capital-tracking?fundId=fund_789', {
  headers: {
    'Cookie': sessionCookie,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### Python
```python
import requests

response = requests.get(
    'https://your-domain.com/api/admin/capital-tracking',
    params={'fundId': 'fund_789'},
    cookies={'session': session_cookie}
)
data = response.json()
```

---

## Changelog

- **January 2026**: Added signature verification endpoint, AUM reporting, capital tracking, bulk actions
- **December 2025**: Added Plaid transfer APIs, wizard progress tracking
- **November 2025**: Initial e-signature APIs, LP portal endpoints
