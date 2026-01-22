# OpenSign API Reference

> API documentation for OpenSign v1  
> Full docs: https://docs.opensignlabs.com/docs/API-docs/v1/opensign-api-v-1/

---

## Authentication

All API requests require the `x-api-token` header:

```
x-api-token: your_api_token_here
```

### Generating API Token

1. Log in to your OpenSign account
2. Navigate to Settings → API Token
3. Generate a new token (Live or Sandbox)
4. Copy and store securely

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Cloud (Production) | https://app.opensignlabs.com/api/v1 |
| Self-Hosted | https://your-domain.com/api/v1 |

---

## Document Endpoints

### Create Document

```http
POST /documents
Content-Type: application/json
x-api-token: your_token

{
  "title": "Contract Agreement",
  "description": "Service agreement for Q1 2026",
  "file": "base64_encoded_pdf_or_url",
  "expirationDate": "2026-02-15T00:00:00Z",
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "SIGNER",
      "signingOrder": 1
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "SIGNER",
      "signingOrder": 2
    }
  ],
  "fields": [
    {
      "type": "SIGNATURE",
      "pageNumber": 1,
      "x": 50,
      "y": 80,
      "width": 20,
      "height": 5,
      "recipientEmail": "john@example.com",
      "required": true
    }
  ],
  "emailSubject": "Please sign this document",
  "emailMessage": "Hello, please review and sign the attached document."
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "objectId": "abc123",
    "title": "Contract Agreement",
    "status": "DRAFT",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

### Get Document

```http
GET /documents/{documentId}
x-api-token: your_token
```

**Response:**
```json
{
  "objectId": "abc123",
  "title": "Contract Agreement",
  "status": "COMPLETED",
  "file": "https://storage.example.com/document.pdf",
  "signedFile": "https://storage.example.com/document-signed.pdf",
  "certificateUrl": "https://storage.example.com/certificate.pdf",
  "recipients": [
    {
      "objectId": "rec1",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "SIGNED",
      "signedAt": "2026-01-15T14:30:00Z"
    }
  ],
  "auditTrail": [...]
}
```

### Send Document

```http
POST /documents/{documentId}/send
x-api-token: your_token
```

Sends the document to all recipients based on their signing order.

**Response:**
```json
{
  "success": true,
  "message": "Document sent successfully",
  "sentTo": ["john@example.com"]
}
```

### Resend to Recipient

```http
POST /documents/{documentId}/resend
Content-Type: application/json
x-api-token: your_token

{
  "recipientEmail": "john@example.com"
}
```

Resends the signing notification email to a specific recipient.

### Void Document

```http
POST /documents/{documentId}/void
Content-Type: application/json
x-api-token: your_token

{
  "reason": "Terms changed, new document required"
}
```

Cancels the document and notifies all recipients.

### List Documents

```http
GET /documents?status=COMPLETED&page=1&limit=10
x-api-token: your_token
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (DRAFT, SENT, COMPLETED, etc.) |
| page | number | Page number for pagination |
| limit | number | Items per page (default 10, max 100) |

---

## Template Endpoints

### Create Template

```http
POST /templates
Content-Type: application/json
x-api-token: your_token

{
  "name": "NDA Template",
  "description": "Standard non-disclosure agreement",
  "file": "base64_encoded_pdf",
  "defaultRecipients": [
    {
      "role": "SIGNER",
      "signingOrder": 1,
      "roleName": "Client"
    },
    {
      "role": "SIGNER",
      "signingOrder": 2,
      "roleName": "Company Representative"
    }
  ],
  "fields": [
    {
      "type": "SIGNATURE",
      "pageNumber": 3,
      "x": 15,
      "y": 75,
      "width": 25,
      "height": 8,
      "recipientRole": "Client",
      "required": true
    },
    {
      "type": "DATE_SIGNED",
      "pageNumber": 3,
      "x": 45,
      "y": 75,
      "width": 15,
      "height": 5,
      "recipientRole": "Client"
    }
  ],
  "defaultEmailSubject": "NDA for your signature",
  "defaultEmailMessage": "Please review and sign this NDA."
}
```

### List Templates

```http
GET /templates
x-api-token: your_token
```

### Create Document from Template

```http
POST /templates/{templateId}/create-document
Content-Type: application/json
x-api-token: your_token

{
  "title": "NDA - Acme Corp",
  "recipients": [
    {
      "roleName": "Client",
      "name": "Bob Wilson",
      "email": "bob@acme.com"
    },
    {
      "roleName": "Company Representative",
      "name": "Alice Johnson",
      "email": "alice@company.com"
    }
  ],
  "sendImmediately": true
}
```

---

## Folder Endpoints (v1.7.0+)

### Create Folder

```http
POST /folders
Content-Type: application/json
x-api-token: your_token

{
  "name": "Q1 2026 Contracts",
  "parentId": null
}
```

### List Folders

```http
GET /folders
x-api-token: your_token
```

### Move Document to Folder

```http
PUT /documents/{documentId}
Content-Type: application/json
x-api-token: your_token

{
  "folderId": "folder123"
}
```

---

## Webhook Events

OpenSign can send webhooks for document events:

| Event | Description |
|-------|-------------|
| document.sent | Document was sent to recipients |
| document.viewed | Recipient viewed the document |
| document.signed | A recipient signed the document |
| document.completed | All recipients completed signing |
| document.declined | A recipient declined to sign |
| document.expired | Document expired before completion |
| document.voided | Sender voided the document |

**Webhook Payload:**
```json
{
  "event": "document.completed",
  "timestamp": "2026-01-15T16:00:00Z",
  "document": {
    "objectId": "abc123",
    "title": "Contract Agreement",
    "status": "COMPLETED",
    "signedFileUrl": "https://storage.example.com/signed.pdf",
    "certificateUrl": "https://storage.example.com/certificate.pdf"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "The requested document does not exist"
  }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing API token |
| FORBIDDEN | 403 | Not authorized to access this resource |
| DOCUMENT_NOT_FOUND | 404 | Document ID does not exist |
| INVALID_STATUS | 400 | Cannot perform action in current status |
| VALIDATION_ERROR | 400 | Request body validation failed |
| RATE_LIMITED | 429 | Too many requests |

---

## Rate Limits

| Plan | Requests/minute |
|------|-----------------|
| Free | 60 |
| Pro | 300 |
| Enterprise | Custom |

---

## SDK & Libraries

Official SDKs are not yet available. Use standard HTTP clients:

**JavaScript/Node.js:**
```javascript
const response = await fetch('https://app.opensignlabs.com/api/v1/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-token': process.env.OPENSIGN_API_TOKEN
  },
  body: JSON.stringify({
    title: 'My Document',
    // ... other fields
  })
});
```

**Python:**
```python
import requests

response = requests.post(
    'https://app.opensignlabs.com/api/v1/documents',
    headers={
        'Content-Type': 'application/json',
        'x-api-token': os.environ['OPENSIGN_API_TOKEN']
    },
    json={
        'title': 'My Document',
        # ... other fields
    }
)
```

---

## API Availability Note

APIs are **not available on the free self-hosted version**. To use APIs with self-hosted deployments, contact `hello@opensignlabs.com` for API access licensing.
