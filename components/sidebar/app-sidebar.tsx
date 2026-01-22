"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import * as React from "react";

import { TeamContextType, initialState, useTeam } from "@/context/team-context";
import {
  BrushIcon,
  CogIcon,
  ContactIcon,
  FolderIcon,
  HouseIcon,
  Loader,
  PenLineIcon,
  ServerIcon,
  WorkflowIcon,
} from "lucide-react";

import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";
import { usePlan } from "@/lib/swr/use-billing";
import useDatarooms from "@/lib/swr/use-datarooms";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { currentTeam, teams, setCurrentTeam, isLoading }: TeamContextType =
    useTeam() || initialState;
  const {
    plan: userPlan,
    isFree,
    isDataroomsPlus,
    isDataroomsPremium,
    isTrial,
  } = usePlan();

  // Check feature flags
  const { features } = useFeatureFlags();

  // Fetch datarooms for the current team
  const { datarooms } = useDatarooms();

  // Prepare datarooms items for sidebar (limit to first 5, sorted by most recent)
  const dataroomItems =
    datarooms && datarooms.length > 0
      ? datarooms.slice(0, 5).map((dataroom) => ({
          title: dataroom.name,
          url: `/datarooms/${dataroom.id}/documents`,
          current:
            router.pathname.includes("/datarooms/[id]") &&
            String(router.query.id) === String(dataroom.id),
        }))
      : undefined;

  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: HouseIcon,
        current: router.pathname.includes("dashboard"),
      },
      {
        title: "All Documents",
        url: "/documents",
        icon: FolderIcon,
        current:
          router.pathname.includes("documents") &&
          !router.pathname.includes("datarooms"),
      },
      {
        title: "All Datarooms",
        url: "/datarooms",
        icon: ServerIcon,
        current: router.pathname === "/datarooms",
        disabled: false,
        isActive: router.pathname.includes("datarooms"),
        items: dataroomItems,
      },
      {
        title: "Visitors",
        url: "/visitors",
        icon: ContactIcon,
        current: router.pathname.includes("visitors"),
        disabled: false,
      },
      {
        title: "E-Signature",
        url: "/sign",
        icon: PenLineIcon,
        current: router.pathname.includes("/sign"),
        disabled: false,
      },
      {
        title: "Workflows",
        url: "/workflows",
        icon: WorkflowIcon,
        current: router.pathname.includes("/workflows"),
        disabled: !features?.workflows,
      },
      {
        title: "Branding",
        url: "/branding",
        icon: BrushIcon,
        current:
          router.pathname.includes("branding") &&
          !router.pathname.includes("datarooms"),
      },
      {
        title: "Settings",
        url: "/settings/general",
        icon: CogIcon,
        isActive:
          router.pathname.includes("settings") &&
          !router.pathname.includes("branding") &&
          !router.pathname.includes("datarooms") &&
          !router.pathname.includes("documents"),
        items: [
          {
            title: "General",
            url: "/settings/general",
            current: router.pathname.includes("settings/general"),
          },
          {
            title: "Team",
            url: "/settings/people",
            current: router.pathname.includes("settings/people"),
          },
          {
            title: "Domains",
            url: "/settings/domains",
            current: router.pathname.includes("settings/domains"),
          },
          {
            title: "Webhooks",
            url: "/settings/webhooks",
            current: router.pathname.includes("settings/webhooks"),
          },
          {
            title: "Funds",
            url: "/settings/funds",
            current: router.pathname.includes("settings/funds"),
          },
        ],
      },
    ],
  };

  // Filter out items that should be hidden based on feature flags
  const filteredNavMain = data.navMain.filter((item) => {
    // Hide workflows if feature flag is not enabled
    if (item.title === "Workflows" && !features?.workflows) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar
      className="bg-gray-50 dark:bg-black"
      sidebarClassName="bg-gray-50 dark:bg-black"
      side="left"
      variant="inset"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader className="gap-y-8">
        <div className="hidden w-full justify-center group-data-[collapsible=icon]:inline-flex">
          <Link href="/dashboard" shallow>
            <Image
              src="/_static/bfg-icon-black.png"
              alt="BF Fund"
              width={32}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/_static/bfg-icon-white.png"
              alt="BF Fund"
              width={32}
              height={32}
              className="hidden dark:block"
            />
          </Link>
        </div>
        <div className="ml-2 flex items-center group-data-[collapsible=icon]:hidden">
          <Link href="/dashboard" shallow>
            <Image
              src="/_static/bfg-logo-black.png"
              alt="BF Fund"
              width={120}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/_static/bfg-logo-white.png"
              alt="BF Fund"
              width={120}
              height={32}
              className="hidden dark:block"
            />
          </Link>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader className="h-5 w-5 animate-spin" /> Loading teams...
          </div>
        ) : (
          <TeamSwitcher
            currentTeam={currentTeam}
            teams={teams}
            setCurrentTeam={setCurrentTeam}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

