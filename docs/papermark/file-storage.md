# File Storage (Replit Object Storage)

## Overview

BF Fund uses Replit Object Storage instead of Vercel Blob or AWS S3. Files are encrypted at rest with AES-256.

## Storage Path Convention

```
/objects/documents/{uuid}/{filename}
```

Example:
```
/objects/documents/clx123abc/pitch-deck.pdf
```

## Upload Flow

```
1. Frontend requests presigned URL from /api/file/replit-upload
2. File uploaded directly to Replit Object Storage
3. Path stored in database (Document.file field)
4. Access via presigned GET URLs
```

### Upload API
```typescript
// POST /api/file/replit-upload
{
  fileName: "pitch-deck.pdf",
  contentType: "application/pdf"
}

// Response
{
  presignedUrl: "https://...",
  objectPath: "/objects/documents/uuid/pitch-deck.pdf"
}
```

## Download Flow

```
1. Frontend requests presigned URL from /api/file/replit-get
2. Presigned URL returned (time-limited)
3. Browser fetches file directly
```

### Download API
```typescript
// POST /api/file/replit-get
{
  key: "/objects/documents/uuid/pitch-deck.pdf"
}

// Response
{
  presignedUrl: "https://..."
}
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/files/put-file-server.ts` | Server-side upload handling |
| `pages/api/file/replit-upload.ts` | Upload presigned URL endpoint |
| `pages/api/file/replit-get.ts` | Download presigned URL endpoint |

## Security

- **AES-256 encryption** at rest
- **Presigned URLs** for all access (time-limited)
- No direct object access without signed URL
- Files are private by default

## Content Type Handling

Some browsers send empty `content-type` for unknown file types. The validation schema accepts empty strings:

```typescript
// lib/zod/url-validation.ts
contentType: z.string()  // Not .min(1)
```

## Bulk Download Limitation

Bulk download (entire dataroom as ZIP) is **not available** because it requires AWS Lambda, which isn't supported on Replit. Individual file downloads work via presigned URLs.

```typescript
// pages/api/teams/[teamId]/datarooms/[id]/download/bulk.ts
// Returns 501 Not Implemented with helpful message
```
