"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useTeam } from "@/context/team-context";
import { FolderPlusIcon, PlusIcon } from "lucide-react";

import useDocuments, { useRootFolders } from "@/lib/swr/use-documents";

import { AddDocumentModal } from "@/components/documents/add-document-modal";
import { DocumentsList } from "@/components/documents/documents-list";
import SortButton from "@/components/documents/filters/sort-button";
import { Pagination } from "@/components/documents/pagination";
import { AddFolderModal } from "@/components/folders/add-folder-modal";
import AppLayout from "@/components/layouts/app";
import { SearchBoxPersisted } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function DocumentsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamInfo = useTeam();
  const currentPage = Number(searchParams?.get("page")) || 1;
  const pageSize = Number(searchParams?.get("limit")) || 10;
  const invitation = searchParams?.get("invitation") as "accepted" | "teamMember" | null;

  useEffect(() => {
    if (invitation) {
      switch (invitation) {
        case "accepted":
          toast.success("Welcome to the team! You've successfully joined.");
          break;
        case "teamMember":
          toast.error("You've already accepted this invitation!");
          break;
        default:
          toast.error("Invalid invitation status");
      }
      router.replace("/documents");
    }
  }, [invitation, router]);

  const { folders, loading: foldersLoading } = useRootFolders();
  const { documents, pagination, isValidating, isFiltered, loading } =
    useDocuments();

  const updatePagination = (newPage?: number, newPageSize?: number) => {
    const params = new URLSearchParams(window.location.search);

    if (newPage) params.set("page", newPage.toString());
    if (newPageSize) {
      params.set("limit", newPageSize.toString());
      params.set("page", "1");
    }

    router.push(`/documents?${params.toString()}`);
  };

  const displayFolders = isFiltered ? [] : folders;

  return (
    <AppLayout>
      <div className="sticky top-0 mb-4 min-h-[calc(100vh-72px)] rounded-lg bg-white p-4 dark:bg-gray-900 sm:mx-4 sm:pt-8">
        <section className="mb-4 flex items-center justify-between space-x-2 sm:space-x-0">
          <div className="space-y-0 sm:space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              All Documents
            </h2>
            <p className="text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-none">
              Manage all your documents in one place.
            </p>
          </div>
          <div className="flex items-center gap-x-2">
            <AddDocumentModal>
              <Button
                className="group flex flex-1 items-center justify-start gap-x-1 whitespace-nowrap px-1 text-left sm:gap-x-3 sm:px-3"
                title="Add Document"
              >
                <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-base">Add Document</span>
              </Button>
            </AddDocumentModal>
            <AddFolderModal>
              <Button
                size="icon"
                variant="outline"
                className="border-gray-500 bg-gray-50 hover:bg-gray-200 dark:bg-black hover:dark:bg-muted"
              >
                <FolderPlusIcon
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              </Button>
            </AddFolderModal>
          </div>
        </section>

        <div className="mb-2 flex justify-end gap-x-2">
          <div className="relative w-full sm:max-w-xs">
            <SearchBoxPersisted loading={isValidating} inputClassName="h-10" />
          </div>
          <SortButton />
        </div>

        <section id="documents-header-count" />

        <Separator className="mb-5 bg-gray-200 dark:bg-gray-800" />

        <DocumentsList
          documents={documents}
          folders={displayFolders}
          teamInfo={teamInfo}
          loading={loading}
          foldersLoading={foldersLoading}
        />

        {isFiltered && pagination && (
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={pagination.total}
            totalShownItems={documents.length}
            totalPages={pagination.pages}
            onPageChange={updatePagination}
            onPageSizeChange={(size) => updatePagination(undefined, size)}
            itemName="documents"
          />
        )}
      </div>
    </AppLayout>
  );
}
