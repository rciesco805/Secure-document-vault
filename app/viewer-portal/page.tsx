import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import ViewerPortalPageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Investor Portal | BF Fund",
  description: "Access your datarooms and investment documents",
};

export default async function ViewerPortalPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner className="h-8 w-8 mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your datarooms...</p>
          </div>
        </div>
      }
    >
      <ViewerPortalPageClient />
    </Suspense>
  );
}
