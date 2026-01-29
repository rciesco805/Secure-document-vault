"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  LayoutTemplateIcon,
  MailIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AuditTrail from "@/components/signature/audit-trail";
import { QRCodeDialog } from "@/components/signature/qr-code-dialog";

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
  const params = useParams();
  const id = params.id as string;
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { document, loading, mutate } = useSignatureDocument(id as string);
  const [isVoiding, setIsVoiding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReminding, setIsReminding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCreatingCopy, setIsCreatingCopy] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    emailSubject: "",
    emailMessage: "",
  });

  const handleRemind = async () => {
    if (!teamId || !document) return;
    setIsReminding(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}/remind`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send reminders");
      }
      toast.success(data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminders");
    } finally {
      setIsReminding(false);
    }
  };

  const handleDownload = async () => {
    if (!teamId || !document) return;
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}/download`
      );
      if (!response.ok) {
        throw new Error("Failed to download document");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.status === "COMPLETED" 
        ? `${document.title.replace(/[^a-zA-Z0-9-_]/g, "_")}_signed.pdf`
        : `${document.title.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Document downloaded successfully");
    } catch (error) {
      toast.error("Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

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
        `/api/teams/${teamId}/signature-documents/${document.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send document");
      }
      toast.success("Document sent for signature! Recipients will receive an email.");
      mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send document");
    } finally {
      setIsSending(false);
    }
  };

  const openEditDialog = () => {
    if (!document) return;
    setEditForm({
      title: document.title,
      description: document.description || "",
      emailSubject: document.emailSubject || "",
      emailMessage: document.emailMessage || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!teamId || !document) return;
    setIsSavingEdit(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editForm.title,
            description: editForm.description || null,
            emailSubject: editForm.emailSubject || null,
            emailMessage: editForm.emailMessage || null,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to update document");
      toast.success("Document updated successfully");
      setIsEditing(false);
      mutate();
    } catch (error) {
      toast.error("Failed to update document");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCorrectAndResend = async () => {
    if (!teamId || !document) return;
    setIsCreatingCopy(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}/correct`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create corrected copy");
      }
      const result = await response.json();
      toast.success("Corrected copy created. The original has been voided.");
      router.push(`/sign/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create corrected copy");
    } finally {
      setIsCreatingCopy(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!teamId || !document) return;
    setIsSavingTemplate(true);
    try {
      const fieldsResponse = await fetch(
        `/api/teams/${teamId}/signature-documents/${document.id}`
      );
      if (!fieldsResponse.ok) throw new Error("Failed to fetch document details");
      const docData = await fieldsResponse.json();

      const templateFields = docData.fields?.map((f: any, index: number) => {
        const recipientIndex = docData.recipients?.findIndex((r: any) => r.id === f.recipientId);
        return {
          type: f.type,
          pageNumber: f.pageNumber,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required,
          placeholder: f.placeholder,
          recipientIndex: recipientIndex >= 0 ? recipientIndex : 0,
        };
      }) || [];

      const defaultRecipients = docData.recipients?.map((r: any) => ({
        name: r.name,
        email: r.email,
        role: r.role,
        signingOrder: r.signingOrder,
      })) || [];

      const response = await fetch(
        `/api/teams/${teamId}/signature-templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.title,
            description: document.description,
            file: docData.file,
            storageType: docData.storageType,
            numPages: document.numPages,
            fields: templateFields,
            defaultRecipients,
            defaultEmailSubject: document.emailSubject,
            defaultEmailMessage: document.emailMessage,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to save template");
      toast.success("Template saved successfully");
      router.push("/sign/templates");
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setIsSavingTemplate(false);
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
            {document.status !== "DRAFT" && document.status !== "COMPLETED" && document.status !== "VOIDED" && (
              <QRCodeDialog
                recipients={document.recipients}
                documentTitle={document.title}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontalIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {isDownloading ? "Downloading..." : document.status === "COMPLETED" ? "Download Signed PDF" : "Download PDF"}
                </DropdownMenuItem>
                {document.status !== "COMPLETED" && document.status !== "VOIDED" && (
                  <DropdownMenuItem onClick={openEditDialog}>
                    <EditIcon className="mr-2 h-4 w-4" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {document.status !== "DRAFT" &&
                  document.status !== "COMPLETED" &&
                  document.status !== "VOIDED" &&
                  document.status !== "EXPIRED" && (
                  <>
                    <DropdownMenuItem onClick={handleRemind} disabled={isReminding}>
                      <BellIcon className="mr-2 h-4 w-4" />
                      {isReminding ? "Sending..." : "Send Reminder"}
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                        >
                          <RefreshCwIcon className="mr-2 h-4 w-4" />
                          Correct & Resend
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Correct and Resend?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will void the current document and create a new draft copy
                            that you can edit and resend. Any existing signatures will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCorrectAndResend}
                            disabled={isCreatingCopy}
                          >
                            {isCreatingCopy ? "Creating..." : "Create Corrected Copy"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleSaveAsTemplate}
                  disabled={isSavingTemplate}
                >
                  <LayoutTemplateIcon className="mr-2 h-4 w-4" />
                  {isSavingTemplate ? "Saving..." : "Save as Template"}
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
                    {document.recipients
                      .sort((a, b) => a.signingOrder - b.signingOrder)
                      .map((recipient, index) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 relative">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                            {recipient.role !== "VIEWER" && (
                              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {recipient.signingOrder}
                              </span>
                            )}
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

            <AuditTrail document={document} />
          </div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
            <DialogDescription>
              Update the document title, description, and email settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Email Subject</Label>
              <Input
                id="edit-subject"
                value={editForm.emailSubject}
                onChange={(e) => setEditForm({ ...editForm, emailSubject: e.target.value })}
                placeholder="Email subject line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-message">Email Message</Label>
              <Textarea
                id="edit-message"
                value={editForm.emailMessage}
                onChange={(e) => setEditForm({ ...editForm, emailMessage: e.target.value })}
                placeholder="Message to recipients"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editForm.title.trim()}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

