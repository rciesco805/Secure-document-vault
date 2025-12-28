# API Conventions

## Route Structure

All team-scoped APIs follow this pattern:
```
/api/teams/[teamId]/resource/[resourceId]/action
```

Examples:
```
GET  /api/teams/{teamId}/datarooms
POST /api/teams/{teamId}/datarooms
GET  /api/teams/{teamId}/datarooms/{id}
POST /api/teams/{teamId}/datarooms/{id}/quick-add
```

## Authentication Pattern

Every protected API route should:

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { CustomUser } from '@/lib/types';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 1. Check session
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }
  
  const userId = (session.user as CustomUser).id;
  const { teamId } = req.query as { teamId: string };
  
  // 2. Verify team membership
  const teamAccess = await prisma.userTeam.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
  });
  
  if (!teamAccess) {
    return res.status(401).end("Unauthorized");
  }
  
  // 3. Handle request methods
  if (req.method === "GET") {
    // Handle GET
  } else if (req.method === "POST") {
    // Handle POST
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
```

## Error Handling

Use the centralized error handler:

```typescript
import { errorhandler } from '@/lib/errorHandler';

try {
  // Your logic
} catch (error) {
  console.error("Context:", error);
  errorhandler(error, res);
}
```

### Manual Error Responses
```typescript
// Not found
return res.status(404).json({ message: "Resource not found" });

// Bad request
return res.status(400).json({ message: "Invalid input" });

// Forbidden
return res.status(403).json({ message: "Access denied" });
```

## Request Body Validation

Use Zod for validation:

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  emails: z.array(z.string().email()),
});

const validation = schema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({
    error: "Validation failed",
    details: validation.error.flatten(),
  });
}

const { name, emails } = validation.data;
```

## Database Transactions

Use Prisma transactions for multi-step operations:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const record1 = await tx.model1.create({ ... });
  const record2 = await tx.model2.create({ ... });
  return { record1, record2 };
});
```

## Response Patterns

### Success with Data
```typescript
return res.status(200).json({ data: result });
return res.status(201).json({ created: newResource });
```

### Success with Message
```typescript
return res.status(200).json({
  message: "Action completed",
  count: items.length,
});
```

### List Response
```typescript
return res.status(200).json({
  items: results,
  totalCount: total,
});
```

## Common Query Parameters

```typescript
const {
  teamId,
  id: resourceId,
  search,     // Text search
  status,     // Filter by status
  page,       // Pagination
  limit,      // Items per page
} = req.query as {
  teamId: string;
  id?: string;
  search?: string;
  status?: string;
  page?: string;
  limit?: string;
};
```

## No Plan Restrictions

BF Fund has all features enabled. Never add plan checks:

```typescript
// DON'T DO THIS:
if (plan !== 'pro') {
  return res.status(403).json({ error: "Upgrade required" });
}

// DO THIS:
// Just proceed with the feature - all features are enabled
```
