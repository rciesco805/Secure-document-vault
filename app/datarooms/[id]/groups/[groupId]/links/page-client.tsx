"use client";

import { useState } from "react";

import { LinkType } from "@prisma/client";
import { PlusIcon } from "lucide-react";

import { useDataroom } from "@/lib/swr/use-dataroom";
import {
  useDataroomGroup,
  useDataroomGroupLinks,
} from "@/lib/swr/use-dataroom-groups";

import { DataroomHeader } from "@/components/datarooms/dataroom-header";
import { DataroomNavigation } from "@/components/datarooms/dataroom-navigation";
import { GroupHeader } from "@/components/datarooms/groups/group-header";
import { GroupNavigation } from "@/components/datarooms/groups/group-navigation";
import AppLayout from "@/components/layouts/app";
import { DataroomLinkSheet } from "@/components/links/link-sheet/dataroom-link-sheet";
import LinksTable from "@/components/links/links-table";
import { Button } from "@/components/ui/button";

interface GroupLinksPageClientProps {
  id: string;
  groupId: string;
}

export default function GroupLinksPageClient({ id, groupId }: GroupLinksPageClientProps) {
  const { dataroom } = useDataroom();
  const { viewerGroup } = useDataroomGroup();
  const { links, loading } = useDataroomGroupLinks();
  const [isLinkSheetOpen, setIsLinkSheetOpen] = useState(false);

  if (!dataroom || !viewerGroup) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout>
      <div className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <header>
          <DataroomHeader
            title={dataroom.name}
            description={dataroom.pId}
            actions={[]}
          />

          <DataroomNavigation dataroomId={dataroom.id} />
        </header>

        <GroupHeader dataroomId={dataroom.id} groupName={viewerGroup.name} />
        <div className="mx-auto grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <GroupNavigation
            dataroomId={dataroom.id}
            viewerGroupId={viewerGroup.id}
          />
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Group Links</h3>
                <p className="text-sm text-muted-foreground">
                  Links created for this group. Viewers using these links will have the group&apos;s permissions.
                </p>
              </div>
              <Button onClick={() => setIsLinkSheetOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Link
              </Button>
            </div>
            {loading ? (
              <div>Loading...</div>
            ) : links && links.length > 0 ? (
              <LinksTable
                links={links}
                targetType={"DATAROOM"}
                dataroomName={dataroom.name}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No links created for this group yet.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsLinkSheetOpen(true)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create your first link
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DataroomLinkSheet
        isOpen={isLinkSheetOpen}
        setIsOpen={setIsLinkSheetOpen}
        linkType={LinkType.DATAROOM_LINK}
        existingLinks={links}
      />
    </AppLayout>
  );
}
