import { useRouter } from "next/router";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";

import { fetcher } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpenIcon,
  LogOutIcon,
  BuildingIcon,
  ExternalLinkIcon,
} from "lucide-react";

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

export default function ViewerPortal() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data, isLoading, error } = useSWR<ViewerDataResponse>(
    status === "authenticated" ? "/api/viewer/my-datarooms" : null,
    fetcher
  );

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Skeleton className="mx-auto h-12 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold">
              BF
            </div>
            <div>
              <h1 className="text-lg font-semibold">BF Fund Investor Portal</h1>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOutIcon className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome, {session?.user?.name || "Investor"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Access the datarooms you&apos;ve been invited to view
          </p>
        </div>

        {error ? (
          <Card className="mx-auto max-w-md">
            <CardContent className="p-8 text-center">
              <p className="text-red-500">Failed to load your datarooms. Please try again.</p>
              <Button className="mt-4" onClick={() => router.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.datarooms.length === 0 ? (
          <Card className="mx-auto max-w-md">
            <CardContent className="p-8 text-center">
              <FolderOpenIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Datarooms Available</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You haven&apos;t been invited to any datarooms yet. Please contact your investment manager for access.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data?.datarooms.map((dataroom) => (
              <Link
                key={dataroom.id}
                href={`/view/${dataroom.linkId}`}
                className="group"
              >
                <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderOpenIcon className="h-5 w-5" />
                      </div>
                      <ExternalLinkIcon className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <CardTitle className="mt-3">{dataroom.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <BuildingIcon className="h-3 w-3" />
                      {dataroom.teamName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      View Dataroom
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t bg-white/50 py-6 text-center text-sm text-muted-foreground dark:bg-gray-900/50">
        <p>BF Fund Investor Portal - Bermuda Franchise Group</p>
        <p className="mt-1">Work Well. Play Well. Be Well.</p>
      </footer>

      {/* Fixed sign out button in lower left corner */}
      <div className="fixed bottom-6 left-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="bg-white/90 backdrop-blur-sm shadow-lg hover:bg-gray-100 dark:bg-gray-800/90 dark:hover:bg-gray-700"
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
