"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTeam } from "@/context/team-context";
import {
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  LayoutTemplateIcon,
  MailIcon,
  PlusIcon,
  XCircleIcon,
  EyeIcon,
  SendIcon,
  AlertCircleIcon,
  UsersIcon,
} from "lucide-react";

import {
  useSignatureDocuments,
  SignatureDocumentStatus,
} from "@/lib/swr/use-signature-documents";
import { timeAgo } from "@/lib/utils";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<
  SignatureDocumentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: <FileTextIcon className="h-3 w-3" />,
  },
  SENT: {
    label: "Sent",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: <SendIcon className="h-3 w-3" />,
  },
  VIEWED: {
    label: "Viewed",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: <EyeIcon className="h-3 w-3" />,
  },
  PARTIALLY_SIGNED: {
    label: "Partially Signed",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    icon: <ClockIcon className="h-3 w-3" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle2Icon className="h-3 w-3" />,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: <XCircleIcon className="h-3 w-3" />,
  },
  VOIDED: {
    label: "Voided",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: <XCircleIcon className="h-3 w-3" />,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: <AlertCircleIcon className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status: SignatureDocumentStatus }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <Badge variant="secondary" className={`gap-1 ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function DocumentsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <FileTextIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium">No signature documents yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Start by uploading a document and adding recipients to collect
        e-signatures.
      </p>
      <Link href="/sign/new">
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Your First Document
        </Button>
      </Link>
    </div>
  );
}

export default function SignatureDashboardClient() {
  const router = useRouter();
  const teamInfo = useTeam();
  const { documents, loading, pagination } = useSignatureDocuments();

  const stats = {
    draft: documents.filter((d) => d.status === "DRAFT").length,
    pending: documents.filter((d) =>
      ["SENT", "VIEWED", "PARTIALLY_SIGNED"].includes(d.status)
    ).length,
    completed: documents.filter((d) => d.status === "COMPLETED").length,
  };

  return (
    <AppLayout>
      <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
        <section className="mb-6 flex items-center justify-between space-x-2 sm:space-x-0">
          <div className="space-y-0 sm:space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              E-Signature
            </h2>
            <p className="text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-none">
              Send documents for signature and track their status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign/templates">
              <Button variant="outline" className="gap-x-1 whitespace-nowrap px-1 sm:gap-x-2 sm:px-3">
                <LayoutTemplateIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="hidden text-xs sm:inline sm:text-base">Templates</span>
              </Button>
            </Link>
            <Link href="/sign/bulk">
              <Button variant="outline" className="gap-x-1 whitespace-nowrap px-1 sm:gap-x-2 sm:px-3">
                <UsersIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="hidden text-xs sm:inline sm:text-base">Bulk Send</span>
              </Button>
            </Link>
            <Link href="/sign/new">
              <Button className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-1 text-left sm:gap-x-3 sm:px-3">
                <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-base">New Document</span>
              </Button>
            </Link>
          </div>
        </section>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Drafts
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.draft}</p>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
            <div className="flex items-center gap-2">
              <MailIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Pending Signatures
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950">
            <div className="flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Completed
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.completed}
            </p>
          </div>
        </div>

        <Separator className="mb-5 bg-gray-200 dark:bg-gray-800" />

        {loading ? (
          <DocumentsTableSkeleton />
        ) : documents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                          <FileTextIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {doc.recipients.slice(0, 2).map((r) => (
                          <span key={r.id} className="text-sm">
                            {r.name || r.email}
                          </span>
                        ))}
                        {doc.recipients.length > 2 && (
                          <span className="text-sm text-muted-foreground">
                            +{doc.recipients.length - 2} more
                          </span>
                        )}
                        {doc.recipients.length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            No recipients
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {timeAgo(new Date(doc.createdAt))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/sign/${doc.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
