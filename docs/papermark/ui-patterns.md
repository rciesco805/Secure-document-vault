# UI Patterns

## Data Fetching (SWR)

All data fetching uses SWR with consistent patterns.

### Basic Pattern
```typescript
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

const { data, error, mutate } = useSWR<ResponseType>(
  teamId ? `/api/teams/${teamId}/resource` : null,
  fetcher
);
```

### With Loading State
```typescript
const { data, isLoading, error } = useSWR<ResponseType>(
  endpoint,
  fetcher
);

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage />;
return <Component data={data} />;
```

### Mutation After Action
```typescript
async function handleCreate() {
  await fetch('/api/resource', { method: 'POST', ... });
  mutate(); // Revalidate data
}
```

## Team Context

Access current team throughout the app:

```typescript
import { useTeam } from '@/context/team-context';

function Component() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  
  // Use teamId in API calls
}
```

## Forms (React Hook Form + Zod)

### Basic Form Pattern
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });
  
  const onSubmit = async (data: FormData) => {
    // Handle submission
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      <Input {...form.register('email')} />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

## Dialogs and Modals

Use shadcn Dialog component:

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function MyModal({ open, setOpen }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogHeader>
        {/* Content */}
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Toast Notifications

Use Sonner for toasts:

```typescript
import { toast } from 'sonner';

// Success
toast.success('Action completed!');

// Error
toast.error('Something went wrong');

// With description
toast.success('Success', {
  description: 'Your changes have been saved',
});
```

## Loading States

### Button Loading
```typescript
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

### Skeleton Loading
```typescript
import { Skeleton } from '@/components/ui/skeleton';

if (isLoading) {
  return <Skeleton className="h-4 w-[200px]" />;
}
```

## Tooltips

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipPortal,
} from '@/components/ui/tooltip';

<Tooltip>
  <TooltipTrigger asChild>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipPortal>
    <TooltipContent>
      <p>Helpful information</p>
    </TooltipContent>
  </TooltipPortal>
</Tooltip>
```

## Icon Usage

Use Lucide React icons:

```typescript
import { Plus, Edit, Trash, Loader2, Zap } from 'lucide-react';

<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>
```
