"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileTextIcon,
  PlusIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  TrashIcon,
  CopyIcon,
  ArrowLeftIcon,
} from "lucide-react";

import { useTeam } from "@/context/team-context";
import { useSignatureTemplates } from "@/lib/swr/use-signature-templates";
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

function TemplatesTableSkeleton() {
  return (
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
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <LayoutTemplateIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium">No templates yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Templates let you quickly create new documents with pre-configured
        fields and settings. Create a document and save it as a template.
      </p>
      <Link href="/sign/new">
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create New Document
        </Button>
      </Link>
    </div>
  );
}

export default function TemplatesPageClient() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { templates, loading, mutate } = useSignatureTemplates();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
    setIsCreating(true);
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
      setIsCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
        <section className="mb-6 flex items-center justify-between space-x-2 sm:space-x-0">
          <div className="flex items-center gap-4">
            <Link href="/sign">
              <Button variant="ghost" size="icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </Link>
            <div className="space-y-0 sm:space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Signature Templates
              </h2>
              <p className="text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-none">
                Reusable document templates for quick signing.
              </p>
            </div>
          </div>
        </section>

        <Separator className="mb-5 bg-gray-200 dark:bg-gray-800" />

        {loading ? (
          <TemplatesTableSkeleton />
        ) : templates.length === 0 ? (
          <EmptyState />
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
                            <p className="text-sm text-muted-foreground">
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
                          disabled={isCreating}
                        >
                          <CopyIcon className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
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
