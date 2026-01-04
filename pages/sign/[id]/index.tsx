import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  MailIcon,
  MoreHorizontalIcon,
  SendIcon,
  Trash2Icon,
  UserIcon,
  XCircleIcon,
  XIcon,
  AlertCircleIcon,
} from "lucide-react";

import {
  useSignatureDocument,
  SignatureDocumentStatus,
} from "@/lib/swr/use-signature-documents";
import { timeAgo } from "@/lib/utils";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusConfig: Record<
  SignatureDocumentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: <FileTextIcon className="h-4 w-4" />,
  },
  SENT: {
    label: "Sent",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: <SendIcon className="h-4 w-4" />,
  },
  VIEWED: {
    label: "Viewed",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    icon: <EyeIcon className="h-4 w-4" />,
  },
  PARTIALLY_SIGNED: {
    label: "Partially Signed",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    icon: <ClockIcon className="h-4 w-4" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle2Icon className="h-4 w-4" />,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: <XCircleIcon className="h-4 w-4" />,
  },
  VOIDED: {
    label: "Voided",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: <XIcon className="h-4 w-4" />,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: <AlertCircleIcon className="h-4 w-4" />,
  },
};

const recipientStatusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-gray-100 text-gray-800",
    icon: <ClockIcon className="h-3 w-3" />,
  },
  SENT: {
    label: "Email Sent",
    color: "bg-blue-100 text-blue-800",
    icon: <MailIcon className="h-3 w-3" />,
  },
  VIEWED: {
    label: "Viewed",
    color: "bg-yellow-100 text-yellow-800",
    icon: <EyeIcon className="h-3 w-3" />,
  },
  SIGNED: {
    label: "Signed",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2Icon className="h-3 w-3" />,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-800",
    icon: <XCircleIcon className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status: SignatureDocumentStatus }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <Badge variant="secondary" className={`gap-1.5 px-3 py-1 ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function RecipientStatusBadge({ status }: { status: string }) {
  const config = recipientStatusConfig[status] || recipientStatusConfig.PENDING;
  return (
    <Badge variant="secondary" className={`gap-1 text-xs ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

export default function SignatureDocumentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { document, loading, mutate } = useSignatureDocument(id as string);
  const [isVoiding, setIsVoiding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleVoid = async () => {
    if (!teamId || !document) return;
    setIsVoiding(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "VOIDED", voidedReason: "Voided by sender" }),
        }
      );
      if (!response.ok) throw new Error("Failed to void document");
      toast.success("Document voided successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to void document");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleDelete = async () => {
    if (!teamId || !document) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete document");
      toast.success("Document deleted successfully");
      router.push("/sign");
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSend = async () => {
    if (!teamId || !document) return;
    
    if (document.recipients.length === 0) {
      toast.error("Please add recipients before sending");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SENT" }),
        }
      );
      if (!response.ok) throw new Error("Failed to send document");
      toast.success("Document sent for signature");
      mutate();
    } catch (error) {
      toast.error("Failed to send document");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
          <div className="text-center">
            <FileTextIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-medium">Document not found</h3>
            <Link href="/sign">
              <Button className="mt-4">Back to Documents</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const signedCount = document.recipients.filter(
    (r) => r.status === "SIGNED"
  ).length;
  const totalSigners = document.recipients.filter(
    (r) => r.role === "SIGNER" || r.role === "APPROVER"
  ).length;

  return (
    <AppLayout>
      <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
        <section className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sign">
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {document.title}
                </h2>
                <StatusBadge status={document.status} />
              </div>
              {document.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {document.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.status === "DRAFT" && (
              <>
                <Link href={`/sign/${document.id}/prepare`}>
                  <Button variant="outline">Prepare Document</Button>
                </Link>
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? "Sending..." : "Send for Signature"}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontalIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {document.status !== "DRAFT" &&
                  document.status !== "COMPLETED" &&
                  document.status !== "VOIDED" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-orange-600"
                        >
                          <XCircleIcon className="mr-2 h-4 w-4" />
                          Void Document
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Void Document?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel the signature request. Recipients will
                            no longer be able to sign this document.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleVoid}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {isVoiding ? "Voiding..." : "Void Document"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                {document.status === "DRAFT" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-600"
                      >
                        <Trash2Icon className="mr-2 h-4 w-4" />
                        Delete Draft
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The document will be
                          permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Recipients
                </CardTitle>
                <CardDescription>
                  {signedCount} of {totalSigners} signers have signed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {document.recipients.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No recipients added yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {document.recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium">{recipient.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {recipient.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {recipient.role === "SIGNER"
                              ? "Signer"
                              : recipient.role === "VIEWER"
                              ? "CC"
                              : "Approver"}
                          </span>
                          <RecipientStatusBadge status={recipient.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(document.createdAt).toLocaleDateString()} (
                    {timeAgo(new Date(document.createdAt))})
                  </p>
                </div>
                {document.sentAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sent</p>
                    <p className="font-medium">
                      {new Date(document.sentAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {document.completedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">
                      {new Date(document.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {document.expirationDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium">
                      {new Date(document.expirationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <FileTextIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Document created</p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(new Date(document.createdAt))}
                      </p>
                    </div>
                  </div>
                  {document.sentAt && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <SendIcon className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Sent for signature</p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(new Date(document.sentAt))}
                        </p>
                      </div>
                    </div>
                  )}
                  {document.completedAt && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">All signatures collected</p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(new Date(document.completedAt))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
