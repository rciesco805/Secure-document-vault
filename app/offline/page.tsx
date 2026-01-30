import { Suspense } from "react";
import { Metadata } from "next";
import OfflinePageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Offline - BF Fund",
  description: "You are currently offline",
};

export default function OfflinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-900">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <OfflinePageClient />
    </Suspense>
  );
}
