import { useTeam } from "@/context/team-context";
import useSWR from "swr";
import { z } from "zod";

import { fetcher } from "@/lib/utils";

import { configSchema } from "./server";

export type LimitProps = z.infer<typeof configSchema> & {
  usage: {
    documents: number;
    links: number;
    users: number;
  };
  dataroomUpload: boolean;
};

export function useLimits() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error } = useSWR<LimitProps | null>(
    teamId && `/api/teams/${teamId}/limits`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  return {
    showUpgradePlanModal: false,
    limits: data,
    canAddDocuments: true,
    canAddLinks: true,
    canAddUsers: true,
    error,
    loading: !data && !error,
  };
}
