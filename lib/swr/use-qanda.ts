import { useTeam } from "@/context/team-context";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

interface ViewerNote {
  id: string;
  content: string;
  viewerEmail: string | null;
  viewerName: string | null;
  pageNumber: number | null;
  createdAt: string;
  document: { id: string; name: string } | null;
  dataroom: { id: string; name: string } | null;
  link: { id: string; name: string } | null;
}

interface QuestionMessage {
  id: string;
  content: string;
  senderType: "VIEWER" | "ADMIN";
  senderEmail: string;
  senderName: string | null;
  createdAt: string;
}

interface DataroomQuestion {
  id: string;
  content: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  viewerEmail: string;
  viewerName: string | null;
  pageNumber: number | null;
  createdAt: string;
  resolvedAt: string | null;
  document: { id: string; name: string } | null;
  dataroom: { id: string; name: string } | null;
  link: { id: string; name: string } | null;
  messages: QuestionMessage[];
}

export function useViewerNotes({
  dataroomId,
  linkId,
}: {
  dataroomId?: string;
  linkId?: string;
} = {}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const params = new URLSearchParams();
  if (dataroomId) params.set("dataroomId", dataroomId);
  if (linkId) params.set("linkId", linkId);
  
  const queryString = params.toString();
  const url = teamId
    ? `/api/teams/${teamId}/qanda/notes${queryString ? `?${queryString}` : ""}`
    : null;

  const { data, error, mutate, isLoading } = useSWR<{
    notes: ViewerNote[];
    total: number;
  }>(url, fetcher, {
    dedupingInterval: 10000,
  });

  return {
    notes: data?.notes || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    mutate,
  };
}

export function useDataroomQuestions({
  dataroomId,
  linkId,
  status,
}: {
  dataroomId?: string;
  linkId?: string;
  status?: "OPEN" | "ANSWERED" | "CLOSED";
} = {}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const params = new URLSearchParams();
  if (dataroomId) params.set("dataroomId", dataroomId);
  if (linkId) params.set("linkId", linkId);
  if (status) params.set("status", status);
  
  const queryString = params.toString();
  const url = teamId
    ? `/api/teams/${teamId}/qanda/questions${queryString ? `?${queryString}` : ""}`
    : null;

  const { data, error, mutate, isLoading } = useSWR<{
    questions: DataroomQuestion[];
    total: number;
  }>(url, fetcher, {
    dedupingInterval: 10000,
  });

  const replyToQuestion = async (questionId: string, content: string) => {
    if (!teamId) return;
    
    const response = await fetch(
      `/api/teams/${teamId}/qanda/questions/${questionId}/reply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );
    
    if (!response.ok) throw new Error("Failed to reply");
    mutate();
  };

  const updateQuestionStatus = async (
    questionId: string,
    status: "OPEN" | "ANSWERED" | "CLOSED"
  ) => {
    if (!teamId) return;
    
    const response = await fetch(
      `/api/teams/${teamId}/qanda/questions/${questionId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    
    if (!response.ok) throw new Error("Failed to update status");
    mutate();
  };

  return {
    questions: data?.questions || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    mutate,
    replyToQuestion,
    updateQuestionStatus,
  };
}
