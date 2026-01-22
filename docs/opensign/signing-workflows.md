# OpenSign Signing Workflows

> Complete reference for document signing workflows and user flows

---

## Document Lifecycle

### Status Flow Diagram

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │
                    [Send Document]
                         │
                         ▼
                    ┌─────────┐
                    │  SENT   │
                    └────┬────┘
                         │
              [First recipient opens]
                         │
                         ▼
                    ┌─────────┐
                    │ VIEWED  │
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    [Recipient      [Some sign]    [Recipient
     declines]           │          declines]
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐   ┌─────────────────┐   ┌─────────┐
    │DECLINED │   │PARTIALLY_SIGNED │   │DECLINED │
    └─────────┘   └────────┬────────┘   └─────────┘
                           │
                    [All recipients
                     complete signing]
                           │
                           ▼
                    ┌───────────┐
                    │ COMPLETED │
                    └───────────┘

Alternative Paths:
┌─────────┐                    ┌─────────┐
│ VOIDED  │ ←── [Sender       │ EXPIRED │ ←── [Expiration
└─────────┘      cancels]      └─────────┘      date passed]
```

---

## Signing Flow (Recipient Perspective)

### Step 1: Receive Email Notification

```
Subject: [Company Name] - Document ready for your signature

Hi [Recipient Name],

[Sender Name] has requested your signature on "[Document Title]".

[Click to Review & Sign]

Message from sender:
"[Custom message from sender]"

This document will expire on [Expiration Date].
```

### Step 2: Access Document

1. Recipient clicks "Review & Sign" button
2. System validates signing token from URL
3. Optional: Enter access code if configured
4. Document loads in signing interface

### Step 3: Review Document

```
┌─────────────────────────────────────────────────────────────┐
│  [Company Logo]        Document Title           [Page 1/5]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              PDF Document Content                   │   │
│  │                                                     │   │
│  │     ┌─────────────────────┐                        │   │
│  │     │ Click to Sign       │  ← Required field      │   │
│  │     │                     │                        │   │
│  │     └─────────────────────┘                        │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [< Previous]  [1] [2] [3] [4] [5]  [Next >]              │
│                                                             │
│           [ Start Signing ] or [ Decline ]                  │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Complete Fields

For each required field, recipient must provide input:

**Signature Field:**
```
┌───────────────────────────────────────┐
│         Draw Your Signature           │
├───────────────────────────────────────┤
│                                       │
│     ~~~~~~~~~~~~~~~                   │  ← Drawing canvas
│       John Doe                        │
│                                       │
├───────────────────────────────────────┤
│  [Clear]                    [Apply]   │
├───────────────────────────────────────┤
│  Options:                             │
│  ○ Draw  ○ Type  ○ Upload Image      │
└───────────────────────────────────────┘
```

**Text Field:**
```
┌───────────────────────────────────────┐
│  Company Name                         │
├───────────────────────────────────────┤
│  [________________________]           │
│   Enter your company name             │
└───────────────────────────────────────┘
```

**Checkbox Field:**
```
┌───────────────────────────────────────┐
│  ☐ I agree to the terms and          │
│    conditions stated above.           │
└───────────────────────────────────────┘
```

### Step 5: Finish Signing

1. All required fields must be completed
2. Click "Finish Signing" button
3. Confirmation modal appears:

```
┌───────────────────────────────────────┐
│         Confirm Your Signature        │
├───────────────────────────────────────┤
│                                       │
│  By clicking "Agree & Sign", you      │
│  agree to be legally bound by this    │
│  document.                            │
│                                       │
│  Your signature will be applied       │
│  along with:                          │
│  • Timestamp: Jan 15, 2026 2:30 PM    │
│  • IP Address: 192.168.1.100          │
│                                       │
├───────────────────────────────────────┤
│     [Cancel]      [Agree & Sign]      │
└───────────────────────────────────────┘
```

### Step 6: Confirmation

```
┌───────────────────────────────────────┐
│         ✓ Document Signed!            │
├───────────────────────────────────────┤
│                                       │
│  You have successfully signed         │
│  "[Document Title]"                   │
│                                       │
│  A confirmation email has been        │
│  sent to your email address.          │
│                                       │
│  [Download Signed Copy]               │
│                                       │
└───────────────────────────────────────┘
```

---

## Sequential Signing Flow

When multiple recipients are configured with signing order:

```
                Document Created (DRAFT)
                         │
                    [Send Document]
                         │
                         ▼
    ┌─────────────────────────────────────────┐
    │  Recipient 1 (Order: 1)                 │
    │  Role: APPROVER                         │
    │  Status: SENT ──► VIEWED ──► SIGNED    │
    └─────────────────────────────────────────┘
                         │
              [Order 1 complete]
                         │
                         ▼
    ┌─────────────────────────────────────────┐
    │  Recipient 2 (Order: 2)                 │
    │  Role: SIGNER                           │
    │  Status: PENDING ──► SENT ──► SIGNED   │
    └─────────────────────────────────────────┘
                         │
              [Order 2 complete]
                         │
                         ▼
    ┌─────────────────────────────────────────┐
    │  Recipient 3 (Order: 3)                 │
    │  Role: SIGNER                           │
    │  Status: PENDING ──► SENT ──► SIGNED   │
    └─────────────────────────────────────────┘
                         │
              [All recipients complete]
                         │
                         ▼
                Document COMPLETED
```

**Key Points:**
- Recipients wait in PENDING until their turn
- Email notification sent only when their order is reached
- If any recipient declines, workflow stops
- Sender can void document at any point

---

## Decline Flow

### Recipient Declines

```
┌───────────────────────────────────────┐
│         Decline to Sign               │
├───────────────────────────────────────┤
│                                       │
│  Please provide a reason for          │
│  declining this document:             │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ I need to review with legal     │ │
│  │ counsel before signing.         │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│                                       │
├───────────────────────────────────────┤
│     [Cancel]      [Confirm Decline]   │
└───────────────────────────────────────┘
```

### Impact of Decline

1. Document status → DECLINED
2. All pending recipients notified
3. Sender receives decline notification with reason
4. Document cannot be signed by others
5. Sender can choose to void and resend

---

## Void Flow (Sender Cancels)

```
┌───────────────────────────────────────┐
│         Void Document                 │
├───────────────────────────────────────┤
│                                       │
│  Are you sure you want to void        │
│  "[Document Title]"?                  │
│                                       │
│  This will:                           │
│  • Cancel all pending signatures      │
│  • Notify all recipients              │
│  • This action cannot be undone       │
│                                       │
│  Reason (optional):                   │
│  ┌─────────────────────────────────┐ │
│  │ Terms have changed, sending     │ │
│  │ updated version.                │ │
│  └─────────────────────────────────┘ │
│                                       │
├───────────────────────────────────────┤
│     [Cancel]      [Void Document]     │
└───────────────────────────────────────┘
```

---

## Bulk Send Workflow

Send the same document to multiple recipients:

### Step 1: Select Template or Document
```
1. Choose a template with pre-configured fields
2. Or upload new document with placeholders
```

### Step 2: Add Recipients List
```
┌───────────────────────────────────────────────────────────┐
│  Bulk Send - Add Recipients                               │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Upload CSV or enter manually:                           │
│                                                           │
│  Name            Email                  Company          │
│  ─────────────── ───────────────────── ──────────────── │
│  John Doe        john@example.com      Acme Corp        │
│  Jane Smith      jane@company.com      Widget Inc       │
│  Bob Wilson      bob@startup.io        StartupCo        │
│                                                           │
│  [+ Add Row]     [Upload CSV]                            │
│                                                           │
│  Total Recipients: 3                                      │
│                                                           │
├───────────────────────────────────────────────────────────┤
│           [Cancel]        [Send to All]                   │
└───────────────────────────────────────────────────────────┘
```

### Step 3: Confirmation
```
- 3 separate documents created
- Each recipient gets their own copy
- Track progress individually
- Can resend or void individually
```

---

## In-Person Signing (QR Code)

For situations where recipient signs in person:

### Generate QR Code
```
┌───────────────────────────────────────┐
│         In-Person Signing             │
├───────────────────────────────────────┤
│                                       │
│  Have the signer scan this QR code:   │
│                                       │
│        ┌─────────────────┐           │
│        │ █▀▀▀▀▀▀▀▀▀▀▀█   │           │
│        │ █ ▄▄▄▄▄▄▄ █ █   │           │
│        │ █ █     █ █ █   │           │
│        │ █ █▄▄▄▄▄█ █ █   │           │
│        │ █▄▄▄▄▄▄▄▄▄█ █   │           │
│        │ ██▄▄▄▄▄▄▄▄▄██   │           │
│        └─────────────────┘           │
│                                       │
│  Or share this link:                  │
│  https://sign.example.com/s/abc123   │
│                                       │
│  Expires in: 30 minutes               │
│                                       │
└───────────────────────────────────────┘
```

### In-Person Signing Flow
1. Signer scans QR code on their mobile device
2. Mobile-optimized signing interface loads
3. Signer completes fields on their own device
4. Signature captured with their device IP/info
5. Document updates in real-time for sender

---

## Template Creation Flow

### Step 1: Upload Base Document
```
- Upload PDF that will be used as template
- PDF is analyzed for page count
```

### Step 2: Define Recipient Roles
```
Role Name        Type        Order
──────────────── ─────────── ─────
Client           SIGNER      1
Account Manager  SIGNER      2
Legal Review     APPROVER    0 (first)
```

### Step 3: Place Fields
```
- Drag fields from palette to PDF
- Assign each field to a role
- Configure required/optional
- Set labels and placeholders
```

### Step 4: Configure Defaults
```
- Default email subject
- Default email message
- Default expiration days
- Make public to team or private
```

### Step 5: Save Template
```
- Template saved for reuse
- Usage count tracked
- Can be updated later
- Documents created from template are independent copies
```
