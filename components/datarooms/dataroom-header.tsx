import Link from "next/link";

import { useState } from "react";

import { BellRingIcon, EyeIcon } from "lucide-react";

import { useDataroom, useDataroomLinks } from "@/lib/swr/use-dataroom";

import { DataroomLinkSheet } from "@/components/links/link-sheet/dataroom-link-sheet";
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
  const { dataroom } = useDataroom();
  const { links } = useDataroomLinks();

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
        <div className="flex gap-2">
          {/* View as Visitor button - only show if there are active links */}
          {links && links.filter(link => !link.isArchived && (!link.expiresAt || new Date(link.expiresAt) > new Date())).length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    const activeLinks = links.filter(link => !link.isArchived && (!link.expiresAt || new Date(link.expiresAt) > new Date()));
                    if (activeLinks[0]) {
                      window.open(`/view/${activeLinks[0].id}`, '_blank');
                    }
                  }}
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View as Visitor
                </Button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <p>Preview how visitors see this dataroom</p>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          )}
          <Button onClick={() => setIsLinkSheetOpen(true)} key={1}>
            Share
          </Button>
        </div>
        <DataroomLinkSheet
          linkType={"DATAROOM_LINK"}
          isOpen={isLinkSheetOpen}
          setIsOpen={setIsLinkSheetOpen}
          existingLinks={links}
        />
      </div>
    </section>
  );
};
