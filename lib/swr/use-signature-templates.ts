import useSWR from "swr";
import { useTeam } from "@/context/team-context";
import { fetcher } from "@/lib/utils";

export interface SignatureTemplate {
  id: string;
  name: string;
  description: string | null;
  file: string;
  fileUrl?: string | null;
  storageType: string;
  numPages: number | null;
  defaultRecipients: any[] | null;
  fields: any[] | null;
  defaultEmailSubject: string | null;
  defaultEmailMessage: string | null;
  defaultExpirationDays: number | null;
  usageCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useSignatureTemplates() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error, mutate } = useSWR<SignatureTemplate[]>(
    teamId ? `/api/teams/${teamId}/signature-templates` : null,
    fetcher
  );

  return {
    templates: data || [],
    loading: !data && !error,
    error,
    mutate,
  };
}

export function useSignatureTemplate(templateId: string | undefined) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error, mutate } = useSWR<SignatureTemplate>(
    teamId && templateId
      ? `/api/teams/${teamId}/signature-templates/${templateId}`
      : null,
    fetcher
  );

  return {
    template: data,
    loading: !data && !error,
    error,
    mutate,
  };
}
