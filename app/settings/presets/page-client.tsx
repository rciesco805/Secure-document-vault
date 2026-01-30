"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { PlanEnum } from "@/ee/stripe/constants";
import { LinkPreset } from "@prisma/client";
import { format } from "date-fns";
import { CheckIcon, CircleHelpIcon, CopyIcon, CrownIcon, PlusIcon, Share2Icon } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { usePlan } from "@/lib/swr/use-billing";
import { fetcher, formatExpirationTime } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import AppLayout from "@/components/layouts/app";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeTooltip } from "@/components/ui/tooltip";
import LoadingSpinner from "@/components/ui/loading-spinner";

type DataroomBasic = {
  id: string;
  pId: string;
  name: string;
};

export default function PresetsPageClient() {
  const router = useRouter();
  const teamInfo = useTeam();

  const { isBusiness, isDatarooms, isDataroomsPlus, isTrial } = usePlan();

  const {
    data: presets,
    error,
    isLoading,
  } = useSWR<LinkPreset[]>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/presets`
      : null,
    fetcher,
  );

  const { data: dataroomsResponse, isLoading: dataroomsLoading } = useSWR<{ datarooms: DataroomBasic[]; totalCount: number }>(
    teamInfo?.currentTeam?.id
      ? `/api/teams/${teamInfo.currentTeam.id}/datarooms`
      : null,
    fetcher,
  );
  const datarooms = dataroomsResponse?.datarooms;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyShareLink = (dataroom: DataroomBasic) => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/public/dataroom/${dataroom.pId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(dataroom.id);
    toast.success(`Copied share link for "${dataroom.name}"`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout>
      <main className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <SettingsHeader />

        {/* Social Share Links Section */}
        <div>
          <div className="mb-4 md:mb-6">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Social Share Links
              </h3>
              <p className="flex flex-row items-center gap-2 text-sm text-muted-foreground">
                Copy public links for sharing your datarooms on social media
                <BadgeTooltip content="These links show a branded landing page where visitors can request access">
                  <CircleHelpIcon className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground" />
                </BadgeTooltip>
              </p>
            </div>
          </div>

          {dataroomsLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading datarooms...</p>
            </div>
          ) : !datarooms || datarooms.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-secondary">
              <p className="text-center text-muted-foreground">
                No datarooms found. Create a dataroom first to get a social share link.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {datarooms.filter(dr => dr.pId).map((dataroom) => (
                <div
                  key={dataroom.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Share2Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{dataroom.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {typeof window !== 'undefined' && `${window.location.origin}/public/dataroom/${dataroom.pId}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyShareLink(dataroom)}
                    className="gap-2"
                  >
                    {copiedId === dataroom.id ? (
                      <>
                        <CheckIcon className="h-4 w-4 text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link Presets Section */}
        <div>
          <div className="mb-4 flex items-center justify-between md:mb-8 lg:mb-12">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Link Presets
              </h3>
              <p className="flex flex-row items-center gap-2 text-sm text-muted-foreground">
                Configure and save presets for your links
                <BadgeTooltip content="Create reusable link configurations that can be applied to new links">
                  <CircleHelpIcon className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground" />
                </BadgeTooltip>
              </p>
            </div>
            {isTrial || isBusiness || isDatarooms || isDataroomsPlus ? (
              <Button onClick={() => router.push("/settings/presets/new")}>
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Create Preset
              </Button>
            ) : (
              <Button onClick={() => setShowUpgradeModal(true)}>
                <CrownIcon className="mr-1.5 h-4 w-4" />
                Upgrade to create presets
              </Button>
            )}
          </div>

          {/* Presets List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading presets...</p>
            </div>
          ) : !presets || presets.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="rounded-full bg-gray-100 p-3">
                <PlusIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="text-center">
                <h3 className="font-medium">No presets configured</h3>
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  Create link presets to quickly apply your preferred settings
                  when creating links.
                </p>
              </div>
              {isTrial || isBusiness || isDatarooms || isDataroomsPlus ? (
                <Button
                  variant="outline"
                  onClick={() => router.push("/settings/presets/new")}
                >
                  Create your first preset
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  Upgrade to create presets
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {presets.map((preset) => (
                <Link
                  key={preset.id}
                  href={`/settings/presets/${preset.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 transition-[filter] hover:bg-gray-50 dark:border-gray-400 dark:bg-secondary dark:hover:bg-gray-800 sm:p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{preset.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>
                            Created:{" "}
                            {format(new Date(preset.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <UpgradePlanModal
        clickedPlan={PlanEnum.Business}
        trigger="presets_page"
        open={showUpgradeModal}
        setOpen={setShowUpgradeModal}
      />
    </AppLayout>
  );
}
