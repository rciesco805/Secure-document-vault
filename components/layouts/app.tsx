import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

import { useTeam } from "@/context/team-context";
import { AppBreadcrumb } from "@/components/layouts/breadcrumb";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const LoadingState = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
    <div className="space-y-4 text-center">
      <Skeleton className="mx-auto h-8 w-48" />
      <Skeleton className="mx-auto h-4 w-32" />
    </div>
  </div>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const teamInfo = useTeam();

  // Default to open (true) if no cookie exists, otherwise use the stored preference
  const cookieValue = Cookies.get(SIDEBAR_COOKIE_NAME);
  const isSidebarOpen =
    cookieValue === undefined ? true : cookieValue === "true";

  // Redirect to viewer portal when no teams after full hydration
  useEffect(() => {
    if (!teamInfo.isLoading && teamInfo.teams.length === 0) {
      router.replace("/viewer-portal");
    }
  }, [teamInfo.isLoading, teamInfo.teams.length, router]);

  // Show loading while hydrating or waiting for redirect
  if (teamInfo.isLoading || !teamInfo.currentTeam) {
    return <LoadingState />;
  }

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <div className="flex flex-1 flex-col gap-x-1 bg-gray-50 dark:bg-black md:flex-row">
        <AppSidebar />
        <SidebarInset className="ring-1 ring-gray-200 dark:ring-gray-800">
          <header className="flex h-10 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <AppBreadcrumb />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
