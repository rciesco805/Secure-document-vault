"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useEffect, useMemo, useState } from "react";

import { useTeam } from "@/context/team-context";
import { ConversationListItem } from "@/ee/features/conversations/components/dashboard/conversation-list-item";
import { ConversationsNotEnabledBanner } from "@/ee/features/conversations/components/dashboard/conversations-not-enabled-banner";
import {
  BookOpenCheckIcon,
  Loader2,
  MessageSquare,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import z from "zod";

import { useDataroom } from "@/lib/swr/use-dataroom";
import useLimits from "@/lib/swr/use-limits";
import { fetcher } from "@/lib/utils";
import { localStorage as safeLocalStorage } from "@/lib/webstorage";

import { DataroomHeader } from "@/components/datarooms/dataroom-header";
import { DataroomNavigation } from "@/components/datarooms/dataroom-navigation";
import AppLayout from "@/components/layouts/app";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  viewerId: string | null;
  viewerEmail?: string;
  documentPageNumber: number | null;
  documentVersionNumber: number | null;
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  dataroomDocument?: {
    document: {
      name: string;
    };
  };
}

export interface PublishedFAQ {
  id: string;
  editedQuestion: string;
  originalQuestion?: string;
  answer: string;
  visibilityMode: "PUBLIC_DATAROOM" | "PUBLIC_LINK" | "PUBLIC_DOCUMENT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  dataroom: {
    name: string;
  };
  link?: {
    name: string;
  };
  dataroomDocument?: {
    document: {
      name: string;
    };
  };
  publishedByUser: {
    name: string;
    email: string;
  };
  sourceConversation?: {
    id: string;
  };
  questionMessage?: {
    id: string;
    content: string;
  };
  answerMessage?: {
    id: string;
    content: string;
  };
}

interface ConversationsPageClientProps {
  id: string;
}

export default function ConversationsPageClient({ id }: ConversationsPageClientProps) {
  const router = useRouter();
  const { limits } = useLimits();
  const { dataroom } = useDataroom();
  const { currentTeamId: teamId } = useTeam();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);
  const [localConversationsEnabled, setLocalConversationsEnabled] = useState<
    boolean | undefined
  >(undefined);
  const [activeTab, setActiveTab] = useState("conversations");

  const isBannerDismissed = useMemo(() => {
    if (!dataroom?.id) return false;
    return (
      safeLocalStorage.getItem(
        `dataroom-${dataroom.id}-conversations-banner-dismissed`,
      ) === "true"
    );
  }, [dataroom?.id]);

  useEffect(() => {
    if (dataroom) {
      setLocalConversationsEnabled(dataroom.conversationsEnabled);
    }
  }, [dataroom]);

  const { data: conversations = [], isLoading: isLoadingConversations } =
    useSWR<ConversationSummary[]>(
      dataroom && teamId
        ? `/api/teams/${teamId}/datarooms/${dataroom.id}/conversations`
        : null,
      fetcher,
      {
        revalidateOnFocus: true,
        dedupingInterval: 10000,
        keepPreviousData: true,
        onError: (err) => {
          console.error("Error fetching conversations:", err);
          toast.error("Failed to load conversations");
        },
      },
    );

  const { data: faqs = [] } = useSWR<PublishedFAQ[]>(
    dataroom && teamId
      ? `/api/teams/${teamId}/datarooms/${dataroom.id}/faqs`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      keepPreviousData: true,
    },
  );

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();

    if (conversation.viewerEmail?.toLowerCase().includes(query)) return true;

    return (
      conversation.title?.toLowerCase().includes(query) ||
      conversation.lastMessage?.content.toLowerCase().includes(query) ||
      conversation.dataroomDocument?.document.name.toLowerCase().includes(query)
    );
  });

  const handleDeleteConversation = async () => {
    if (!conversationToDelete || !dataroom || !teamId) return;

    setIsDeleting(true);
    try {
      const teamIdParsed = z.string().cuid().parse(teamId);
      const dataroomIdParsed = z.string().cuid().parse(dataroom.id);
      const conversationToDeleteParsed = z
        .string()
        .cuid()
        .parse(conversationToDelete);

      const response = await fetch(
        `/api/teams/${teamIdParsed}/datarooms/${dataroomIdParsed}/conversations/${conversationToDeleteParsed}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete conversation");

      toast.success("Conversation deleted successfully");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const navigateToConversation = (conversationId: string) => {
    router.push(`/datarooms/${dataroom?.id}/conversations/${conversationId}`);
  };

  const handleConversationsToggled = (enabled: boolean) => {
    setLocalConversationsEnabled(enabled);
  };

  if (!dataroom) {
    return <div>Loading...</div>;
  }

  if (!limits?.conversationsInDataroom) {
    router.push(`/datarooms/${dataroom?.id}/documents`);
  }

  const isConversationsEnabled =
    localConversationsEnabled !== undefined
      ? localConversationsEnabled
      : dataroom.conversationsEnabled;

  return (
    <AppLayout>
      <div className="relative mx-2 my-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <header>
          <DataroomHeader title={dataroom.name} description={dataroom.pId} />
          <DataroomNavigation dataroomId={dataroom.id} />
        </header>

        {!isBannerDismissed && (
          <ConversationsNotEnabledBanner
            dataroomId={dataroom.id}
            teamId={teamId as string}
            isConversationsEnabled={isConversationsEnabled}
            onConversationsToggled={handleConversationsToggled}
          />
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger
              value="conversations"
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Conversations
              <Badge variant="notification">{conversations.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="faqs" asChild>
              <Link
                href={`/datarooms/${dataroom.id}/conversations/faqs`}
                className="flex items-center gap-2"
              >
                <BookOpenCheckIcon className="h-4 w-4" />
                Published FAQs
                <Badge variant="notification">{faqs.length}</Badge>
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="space-y-0">
            <div className="h-[calc(100vh-20rem)] overflow-hidden rounded-md border">
              <div className="flex h-full flex-col md:flex-row">
                <div className="flex h-full w-full flex-col border-r md:w-96">
                  <div className="flex items-center p-4">
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex h-[calc(100%-7.5rem)] flex-col">
                    <div className="m-0 flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="flex flex-col gap-2 p-4 pt-0">
                          {isLoadingConversations ? (
                            <div className="flex h-20 items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : filteredConversations.length === 0 ? (
                            <div className="flex h-20 items-center justify-center">
                              <p className="text-sm text-muted-foreground">
                                No conversations found
                              </p>
                            </div>
                          ) : (
                            [...filteredConversations]
                              .sort(
                                (a, b) =>
                                  new Date(b.updatedAt).getTime() -
                                  new Date(a.updatedAt).getTime(),
                              )
                              .map((conversation) => (
                                <ConversationListItem
                                  key={conversation.id}
                                  navigateToConversation={
                                    navigateToConversation
                                  }
                                  conversation={conversation}
                                  isActive={false}
                                />
                              ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>

                <div className="hidden flex-1 items-center justify-center md:flex">
                  <div className="text-center">
                    <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">
                      Select a conversation
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose a conversation to view and reply
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConversation}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
