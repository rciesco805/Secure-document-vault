"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTeam } from "@/context/team-context";
import { usePlan } from "@/lib/swr/use-billing";
import useViewer from "@/lib/swr/use-viewer";

import AppLayout from "@/components/layouts/app";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactsDocumentsTable } from "@/components/visitors/contacts-document-table";
import { VisitorAvatar } from "@/components/visitors/visitor-avatar";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function VisitorDetailPageClient() {
  const router = useRouter();
  const params = useParams();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { isFree, isTrial } = usePlan();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("lastViewed");
  const [sortOrder, setSortOrder] = useState("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { viewer, durations, loadingDurations, error } = useViewer(
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
  );
  const views = viewer?.views;
  const pagination = viewer?.pagination;
  const sorting = viewer?.sorting;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleSortChange = (newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!viewer || !teamId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/viewers/${viewer.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete visitor");
      }

      toast.success("Visitor deleted successfully");
      router.push("/visitors");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete visitor");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (isFree && !isTrial) router.push("/documents");
  }, [isTrial, isFree, router]);

  if (error) {
    router.push("/visitors");
    return null;
  }

  return (
    <AppLayout>
      <div className="p-4 pb-0 sm:m-4 sm:py-4">
        {viewer ? (
          <section className="mb-4 flex flex-col justify-between md:mb-8 lg:mb-12">
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <VisitorAvatar viewerEmail={viewer.email} />
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {viewer.email}
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDeleteClick}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </section>
        ) : (
          <VisitorDetailHeaderSkeleton />
        )}

        <Separator className="bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="relative p-4 pt-0 sm:mx-4 sm:mt-4">
        <ContactsDocumentsTable
          views={views}
          durations={durations}
          loadingDurations={loadingDurations}
          pagination={pagination}
          sorting={sorting}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
        />
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visitor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {viewer?.email}? This will
              permanently remove this visitor and all their viewing history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

const VisitorDetailHeaderSkeleton = () => {
  return (
    <section className="mb-4 flex flex-col justify-between md:mb-8 lg:mb-12">
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/visitors">All Visitors</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="h-6 w-24 rounded-md" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mt-2 flex items-center gap-x-2">
        <Skeleton className="hidden h-10 w-10 flex-shrink-0 rounded-full sm:inline-flex" />
        <Skeleton className="h-8 w-48 rounded-md sm:w-64" />
      </div>
    </section>
  );
};
