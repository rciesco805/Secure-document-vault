import Link from "next/link";

import { useState } from "react";

import { BellRingIcon, EyeIcon, Loader2, Share2, Zap } from "lucide-react";
import { toast } from "sonner";

import { useDataroom, useDataroomLinks } from "@/lib/swr/use-dataroom";

import { DataroomLinkSheet } from "@/components/links/link-sheet/dataroom-link-sheet";
import { QuickAddModal } from "@/components/datarooms/quick-add-modal";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const DataroomHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode[];
}) => {
  const [isLinkSheetOpen, setIsLinkSheetOpen] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const { dataroom } = useDataroom();
  const { links } = useDataroomLinks();

  const handleViewAsVisitor = async () => {
    const activeLinks = links?.filter(link => !link.isArchived && (!link.expiresAt || new Date(link.expiresAt) > new Date()));
    if (!activeLinks || activeLinks.length === 0) return;
    
    const linkId = activeLinks[0].id;
    setIsLoadingPreview(true);
    
    try {
      const response = await fetch(`/api/links/${linkId}/preview`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to create preview session");
      }
      
      const { previewToken } = await response.json();
      window.open(`/view/${linkId}?previewToken=${previewToken}`, '_blank');
    } catch (error) {
      console.error("Error creating preview:", error);
      toast.error("Failed to open preview. Please try again.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const actionRows: React.ReactNode[][] = [];
  if (actions) {
    for (let i = 0; i < actions.length; i += 3) {
      actionRows.push(actions.slice(i, i + 3));
    }
  }

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex min-h-10 items-center gap-x-2 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {dataroom?.enableChangeNotifications ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/datarooms/${dataroom?.id}/settings/notifications`}
                >
                  <Button variant="ghost" size="icon" className="size-8">
                    <BellRingIcon className="inline-block !size-4 text-[#fb7a00]" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  side="right"
                  className="text-center text-muted-foreground"
                >
                  <p>Change notifications are enabled</p>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          ) : null}
        </div>
        <div className="flex gap-1 sm:gap-2">
          {/* View as Visitor button - only show if there are active links */}
          {links && links.filter(link => !link.isArchived && (!link.expiresAt || new Date(link.expiresAt) > new Date())).length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewAsVisitor}
                  disabled={isLoadingPreview}
                  className="h-8 px-2 sm:h-9 sm:px-3"
                >
                  {isLoadingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                  ) : (
                    <EyeIcon className="h-4 w-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">View as Visitor</span>
                </Button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <p>Preview how visitors see this dataroom</p>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQuickAddOpen(true)}
                className="h-8 px-2 sm:h-9 sm:px-3 border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
              >
                <Zap className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                <p>Add users with one-click access</p>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
          {dataroom?.pId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const baseUrl = window.location.origin;
                    const shareUrl = `${baseUrl}/public/dataroom/${dataroom.pId}`;
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Social share link copied!");
                  }}
                  className="h-8 px-2 sm:h-9 sm:px-3"
                >
                  <Share2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Social Share</span>
                </Button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <p>Copy public link for social media sharing</p>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          )}
          <Button 
            onClick={() => setIsLinkSheetOpen(true)} 
            size="sm"
            className="h-8 px-2 sm:h-9 sm:px-3"
          >
            Share
          </Button>
        </div>
        <DataroomLinkSheet
          linkType={"DATAROOM_LINK"}
          isOpen={isLinkSheetOpen}
          setIsOpen={setIsLinkSheetOpen}
          existingLinks={links}
        />
        {dataroom?.id && (
          <QuickAddModal
            open={isQuickAddOpen}
            setOpen={setIsQuickAddOpen}
            dataroomId={dataroom.id}
          />
        )}
      </div>
    </section>
  );
};
