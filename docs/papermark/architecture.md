# Papermark Architecture

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 14 | Pages Router (not App Router) for main app |
| Language | TypeScript | Strict typing throughout |
| Styling | Tailwind CSS | CSS variables for theming |
| UI Components | shadcn/ui | Radix UI primitives |
| Database | PostgreSQL | Prisma ORM |
| Auth | NextAuth.js | Prisma adapter, magic links |
| Email | Resend | Transactional emails |
| File Storage | Replit Object Storage | AES-256 encrypted |
| Analytics | Tinybird (optional) | Page-level view tracking |

## Directory Structure

```
/
├── app/                    # App Router (auth pages only)
│   └── (auth)/            # Login, verify, register
│
├── pages/                  # Pages Router (main app)
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── teams/         # Team management
│   │   │   └── [teamId]/
│   │   │       ├── datarooms/
│   │   │       ├── documents/
│   │   │       └── links/
│   │   └── file/          # File upload/download
│   ├── datarooms/         # Dataroom pages
│   └── settings/          # Settings pages
│
├── components/            # React components
│   ├── datarooms/         # Dataroom-specific
│   ├── documents/         # Document components
│   ├── links/             # Link management
│   ├── ui/                # shadcn primitives
│   └── view/              # Viewer-facing
│
├── lib/                   # Utilities
│   ├── swr/               # Data fetching hooks
│   ├── utils/             # Helper functions
│   └── files/             # File handling
│
├── prisma/                # Database
│   └── schema/            # Split schema files
│
└── ee/                    # Enterprise features
    ├── datarooms/         # Dataroom EE features
    ├── features/          # Feature modules
    └── limits/            # Plan limits (all unlimited)
```

## Request Flow

### Admin User Flow
```
Browser → Middleware (auth check) → Pages Router → API Route → Prisma → PostgreSQL
                                                       ↓
                                              Replit Object Storage
```

### Viewer Flow (Document Access)
```
Magic Link Email → /view/[linkId] → Email Verification → Session Cookie → Full Access
```

## Key Patterns

### Data Fetching (SWR)
```typescript
const { data, mutate, error } = useSWR<Type>(
  teamId ? `/api/teams/${teamId}/resource` : null,
  fetcher
);
```

### Team Context
```typescript
const teamInfo = useTeam();
const teamId = teamInfo?.currentTeam?.id;
```

### API Authentication
```typescript
const session = await getServerSession(req, res, authOptions);
if (!session) return res.status(401).end("Unauthorized");
```

## PDF Rendering

### Overview
PDFs are rendered using `react-pdf` (v10.x), which wraps Mozilla's PDF.js library. The library requires a Web Worker to process PDFs in a background thread.

### Worker Configuration
The PDF.js worker must be configured before rendering any PDFs. For react-pdf v10, the worker uses ES modules (`.mjs` extension):

```typescript
import { pdfjs } from "react-pdf";

// REQUIRED: Configure worker URL (must use .mjs for react-pdf v10+)
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

### Files Using PDF Rendering
| File | Purpose |
|------|---------|
| `components/view/viewer/pdf-default-viewer.tsx` | Main viewer for visitors |
| `components/documents/preview-viewers/preview-pdf-viewer.tsx` | Admin preview modal |
| `lib/utils/get-page-number-count.ts` | Page count extraction |

### Content Security Policy
The CSP in `next.config.mjs` must allow the worker source:

```javascript
`worker-src 'self' blob: https://unpkg.com; `
```

### Common Issues

**"Failed to load PDF file" / "Setting up fake worker"**
- **Cause**: Worker URL incorrect or blocked by CSP
- **Fix**: Ensure worker URL uses `.mjs` extension and CSP allows unpkg.com

**Version Mismatch Error**
- **Cause**: Worker version doesn't match pdfjs-dist version
- **Fix**: Always use `${pdfjs.version}` template literal to keep versions in sync

**react-pdf v10 Breaking Changes**
- Worker file extension changed from `.js` to `.mjs`
- CDN source changed from cdnjs.cloudflare.com to unpkg.com
- ES module format required
