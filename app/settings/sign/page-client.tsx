"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTeam } from "@/context/team-context";
import { useSignatureTemplates } from "@/lib/swr/use-signature-templates";
import { timeAgo } from "@/lib/utils";
import { putFile } from "@/lib/files/put-file";

import AppLayout from "@/components/layouts/app";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutTemplateIcon,
  PlusIcon,
  MoreHorizontalIcon,
  TrashIcon,
  CopyIcon,
  UploadIcon,
  Loader2Icon,
  FileIcon,
  PenLineIcon,
  ExternalLinkIcon,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function SignSettingsPageClient() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { templates, loading, mutate } = useSignatureTemplates();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    if (!deleteId || !teamId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-templates/${deleteId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete template");
      toast.success("Template deleted");
      mutate();
    } catch (error) {
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    if (!teamId) return;
    setIsUsingTemplate(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/signature-templates/${templateId}/use`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) throw new Error("Failed to create document");
      const document = await response.json();
      toast.success("Document created from template");
      router.push(`/sign/${document.id}`);
    } catch (error) {
      toast.error("Failed to create document from template");
    } finally {
      setIsUsingTemplate(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCreateTemplate = async () => {
    if (!teamId || !templateName || !selectedFile) return;
    
    setIsCreating(true);
    setIsUploading(true);

    try {
      const { type, data } = await putFile({
        file: selectedFile,
        teamId: teamId,
      });

      setIsUploading(false);

      const response = await fetch(`/api/teams/${teamId}/signature-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          file: data,
          storageType: type,
          defaultRecipients: [
            { role: "SIGNER", name: "Signer 1", order: 1 }
          ],
          fields: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to create template");

      const template = await response.json();
      toast.success("Template created! Now add signature fields.");
      mutate();
      resetCreateForm();
      router.push(`/sign/templates/${template.id}/prepare`);
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
  };

  const resetCreateForm = () => {
    setIsCreateOpen(false);
    setTemplateName("");
    setTemplateDescription("");
    setSelectedFile(null);
  };

  return (
    <AppLayout>
      <main className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <SettingsHeader />
        <div>
          <div className="mb-4 flex items-center justify-between md:mb-8 lg:mb-12">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Signature Templates
              </h3>
              <p className="text-sm text-muted-foreground">
                Create reusable NDA and subscription document templates for quick sending.
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-16">
              <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4">
                <LayoutTemplateIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-center">
                <h3 className="font-medium">No templates yet</h3>
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  Create reusable templates for NDAs, subscription agreements, and other documents you send often.
                </p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Times Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-100 dark:bg-purple-900">
                            <LayoutTemplateIcon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            {template.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {template.numPages || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {template.usageCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {timeAgo(new Date(template.createdAt))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUseTemplate(template.id)}
                            disabled={isUsingTemplate}
                          >
                            <CopyIcon className="mr-2 h-4 w-4" />
                            Use
                          </Button>
                          <Link href={`/sign/templates/${template.id}/prepare`}>
                            <Button variant="outline" size="sm">
                              <PenLineIcon className="mr-2 h-4 w-4" />
                              Edit Fields
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setDeleteId(template.id)}
                                className="text-red-600"
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={resetCreateForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Signature Template</DialogTitle>
            <DialogDescription>
              Upload a PDF document and configure it as a reusable template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., NDA Agreement, Subscription Document"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Brief description of this template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>PDF Document *</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-red-100 dark:bg-red-900">
                    <FileIcon className="h-5 w-5 text-red-600 dark:text-red-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
                >
                  <UploadIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF files only, up to 10MB
                  </p>
                </button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!templateName || !selectedFile || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading..." : "Creating..."}
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template. Documents created from
              this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
