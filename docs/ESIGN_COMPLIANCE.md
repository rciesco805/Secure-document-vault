# Electronic Signature Compliance

## Legal Framework

BF Fund Sign is designed to comply with the Electronic Signatures in Global and National Commerce Act (ESIGN Act) and the Uniform Electronic Transactions Act (UETA), which establish the legal validity of electronic signatures in the United States.

## ESIGN Act Compliance (15 U.S.C. § 7001 et seq.)

The ESIGN Act provides that:
- A signature, contract, or other record may not be denied legal effect solely because it is in electronic form
- A contract may not be denied legal effect solely because an electronic signature was used in its formation

### Our Implementation

1. **Intent to Sign**: Users must explicitly click to sign, demonstrating clear intent
2. **Consent to Electronic Records**: Users consent to receiving and signing documents electronically before signing
3. **Association of Signature**: Each signature is cryptographically linked to the specific document version via SHA-256 checksum
4. **Record Retention**: All signed documents are stored with complete audit trails

## UETA Compliance

UETA has been adopted by 49 states and provides similar protections for electronic transactions. Our platform ensures:

1. **Attribution**: Signatures are attributable to the signer through:
   - Authenticated user sessions
   - IP address logging
   - User agent tracking
   - Timestamp recording
   - Geolocation (derived from IP)

2. **Effect of Electronic Record**: Electronic records satisfy any law requiring a written record

3. **Notarization**: For documents requiring notarization, users must complete additional verification steps

## Audit Trail Requirements

Every signature event captures:

| Field | Description |
|-------|-------------|
| `signerId` | Unique identifier of the signer |
| `signedAt` | ISO 8601 timestamp of signature |
| `ipAddress` | IP address of the signing device |
| `userAgent` | Browser/device information |
| `geoLocation` | Geographic location derived from IP |
| `documentHash` | SHA-256 hash of the PDF bytes at signing |
| `signatureHash` | SHA-256 hash of the signature data |
| `consentTimestamp` | When user consented to e-signature |
| `consentVersion` | Version of consent language accepted |
| `consentText` | Full consent text user agreed to |
| `sessionId` | Unique session identifier |

## Consent Capture (January 2026)

### Explicit Consent Flow

Before any signature is accepted, users must provide explicit consent:

```json
{
  "consent": {
    "agreed": true,
    "version": "1.0",
    "timestamp": "2026-01-25T12:00:00Z",
    "text": "By signing this document electronically..."
  }
}
```

### SignatureConsent Model

All consent records are persisted for compliance:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique consent record ID |
| `recipientId` | String | FK to signature recipient |
| `consentText` | Text | Full consent language displayed |
| `consentVersion` | String | Version identifier (e.g., "1.0") |
| `agreedAt` | DateTime | Timestamp of consent |
| `ipAddress` | String | IP address at consent |
| `userAgent` | String | Browser at consent |

### Consent Language (v1.0)

```
By signing this document electronically, I agree that:
1. My electronic signature is legally binding and equivalent to a handwritten signature
2. I consent to receive documents and conduct business electronically
3. I understand I can request paper copies at any time
4. I can withdraw my consent by contacting the document sender
```

## Document Checksum Verification

### SHA-256 Checksum Generation

Each signed document includes a cryptographic checksum of the actual PDF bytes:

```typescript
const checksum = crypto.createHash('sha256')
  .update(pdfBuffer)
  .digest('hex');
```

### Checksum Storage

Checksums are stored in the `SignatureAudit` model:

| Field | Description |
|-------|-------------|
| `documentChecksum` | SHA-256 hash of PDF at signing |
| `signatureChecksum` | Combined hash of signer + timestamp + document |

## Signature Verification API

### Endpoint

**GET** `/api/sign/verify/[token]`

Verify the integrity and compliance of any signed document.

### Rate Limiting

- 10 requests per minute per IP
- Returns 429 if exceeded

### Response

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

### Verification Process

1. Retrieve the signed document from storage
2. Recalculate the document hash from PDF bytes
3. Compare against the stored `documentChecksum`
4. Validate the signature checksum against stored data
5. Confirm consent was captured before signing
6. Return compliance status

## 506(c) Compliance

For SEC Rule 506(c) offerings, additional requirements are met:

1. **Accredited Investor Verification**: Self-certification wizard with 4-checkbox acknowledgment and audit trail
2. **KYC/AML Verification**: Persona integration for identity verification with built-in sanctions screening
3. **KYC Post-Bank Enforcement**: Transactions blocked until KYC status is APPROVED/VERIFIED
4. **AML Screening**: Risk scoring on all transactions with velocity limits
5. **Subscription Agreement Execution**: Legally binding electronic execution with consent capture
6. **Document Retention**: 7-year minimum retention period
7. **Export Capability**: Full compliance data export for SEC review

## AML Screening Integration (January 2026)

All capital transactions are screened against AML thresholds:

| Threshold | Trigger | Risk Points |
|-----------|---------|-------------|
| Single Transaction | > $100,000 | +30 |
| Daily Cumulative | > $250,000 | +40 |
| High Velocity | 5+ transactions/24hrs | +25 |
| **Block** | **>= 70 points** | **Manual Review** |

Screening results are logged to the audit trail for compliance reporting.

## Record Retention

All signed documents and audit trails are retained for:
- **Subscription Agreements**: Minimum 7 years from fund dissolution
- **NDA/Confidentiality**: Duration of agreement plus 3 years
- **General Documents**: Minimum 5 years
- **Consent Records**: Same as associated document

## Data Portability

All compliance data can be exported via `/api/admin/export`:

- `signatureAudit` - Complete signature audit logs
- `signatureConsent` - All consent records
- `auditLog` - General audit events
- `viewAudit` - Document view tracking

Export formats: JSON (default), CSV

## Audit Dashboard

Admins can access the compliance audit dashboard at `/admin/audit`:

- Filter by event type, date range, signer
- Search by email or name
- Pagination (25 records per page)
- Export to CSV or HTML report
- 506(c) compliance notice display

## Contact

For questions about electronic signature compliance, contact your fund administrator.

---

*Last updated: January 25, 2026*
