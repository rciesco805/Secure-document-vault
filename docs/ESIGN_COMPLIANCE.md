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
3. **Association of Signature**: Each signature is cryptographically linked to the specific document version
4. **Record Retention**: All signed documents are stored with complete audit trails

## UETA Compliance

UETA has been adopted by 49 states and provides similar protections for electronic transactions. Our platform ensures:

1. **Attribution**: Signatures are attributable to the signer through:
   - Authenticated user sessions
   - IP address logging
   - User agent tracking
   - Timestamp recording

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
| `documentHash` | SHA-256 hash of the document at signing |
| `signatureHash` | SHA-256 hash of the signature data |
| `consentTimestamp` | When user consented to e-signature |
| `consentVersion` | Version of consent language accepted |

## Signature Verification

Each signature includes:

1. **Document Checksum**: SHA-256 hash of the PDF content at time of signing
2. **Signature Checksum**: SHA-256 hash combining signer ID, timestamp, and document hash
3. **Verification Token**: Unique token for independent verification

### Verification Process

To verify a signature:
1. Retrieve the signed document from storage
2. Recalculate the document hash
3. Compare against the stored `documentHash`
4. Validate the signature checksum against stored data
5. Confirm audit trail integrity

## Consent Requirements

Before signing, users must acknowledge:

1. **Electronic Signature Consent**: Agreement to use electronic signatures
2. **Electronic Records Consent**: Agreement to receive documents electronically
3. **Hardware/Software Requirements**: Confirmation they can access electronic records
4. **Right to Paper Copy**: Awareness they can request paper copies
5. **Consent Withdrawal**: Understanding how to withdraw consent

## 506(c) Compliance

For SEC Rule 506(c) offerings, additional requirements are met:

1. **Accredited Investor Verification**: Self-certification with audit trail
2. **KYC/AML Verification**: Persona integration for identity verification
3. **Subscription Agreement Execution**: Legally binding electronic execution
4. **Document Retention**: 7-year minimum retention period

## Record Retention

All signed documents and audit trails are retained for:
- **Subscription Agreements**: Minimum 7 years from fund dissolution
- **NDA/Confidentiality**: Duration of agreement plus 3 years
- **General Documents**: Minimum 5 years

## Contact

For questions about electronic signature compliance, contact your fund administrator.
