"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOutWithCacheClear } from "@/lib/offline/use-offline-cache-sync";
import useSWR from "swr";
import { useEffect, useRef, useState } from "react";

import { fetcher } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FolderOpenIcon,
  LogOutIcon,
  BuildingIcon,
  ExternalLinkIcon,
  Loader2Icon,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface DataroomAccess {
  id: string;
  name: string;
  linkId: string;
  teamName: string;
}

interface ViewerDataResponse {
  datarooms: DataroomAccess[];
  viewerEmail: string;
}

interface Team {
  id: string;
  role: string;
}

export default function ViewerPortalPageClient() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status ?? "loading";
  const hasRedirected = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: teamsData } = useSWR<Team[]>(
    status === "authenticated" ? "/api/teams" : null,
    fetcher
  );

  const isAdmin = teamsData && teamsData.length > 0;

  useEffect(() => {
    if (status === "authenticated" && isAdmin && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/dashboard");
    }
  }, [status, isAdmin, router]);

  const { data, isLoading, error } = useSWR<ViewerDataResponse>(
    status === "authenticated" && !isAdmin ? "/api/viewer/my-datarooms" : null,
    fetcher
  );

  useEffect(() => {
    if (data?.datarooms && data.datarooms.length === 1 && !hasRedirected.current) {
      hasRedirected.current = true;
      setIsRedirecting(true);
      router.replace(`/view/${data.datarooms[0].linkId}`);
    }
  }, [data, router]);

  if (status === "loading" || isLoading || isAdmin || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your datarooms...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleLogout = async () => {
    await signOutWithCacheClear({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm sm:text-base flex-shrink-0">
              BF
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg font-semibold truncate">BF Fund Investor Portal</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex-shrink-0 ml-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <LogOutIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-3 sm:px-4 py-6 sm:py-12">
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
            Welcome, {session?.user?.name || "Investor"}
          </h2>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Access the datarooms you&apos;ve been invited to view
          </p>
        </div>

        {error ? (
          <Card className="mx-auto max-w-md">
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-red-500 text-sm sm:text-base">Failed to load your datarooms. Please try again.</p>
              <Button className="mt-4 w-full sm:w-auto" onClick={() => router.refresh()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.datarooms.length === 0 ? (
          <Card className="mx-auto max-w-md">
            <CardContent className="p-6 sm:p-8 text-center">
              <FolderOpenIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              <h3 className="mt-4 text-base sm:text-lg font-medium">No Datarooms Available</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                You haven&apos;t been invited to any datarooms yet. Please contact your investment manager for access.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {data?.datarooms.map((dataroom) => (
              <Link
                key={dataroom.id}
                href={`/view/${dataroom.linkId}`}
                className="group"
              >
                <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderOpenIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <ExternalLinkIcon className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <CardTitle className="mt-2 sm:mt-3 text-base sm:text-lg">{dataroom.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
                      <BuildingIcon className="h-3 w-3" />
                      {dataroom.teamName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm py-2">
                      View Dataroom
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-white/50 py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground dark:bg-gray-900/50">
        <p>BF Fund Investor Portal - Bermuda Franchise Group</p>
        <p className="mt-1">Work Well. Play Well. Be Well.</p>
      </footer>

      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-gray-100 dark:bg-gray-800/90 dark:hover:bg-gray-700 text-xs sm:text-sm px-2 sm:px-3"
        >
          <LogOutIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
