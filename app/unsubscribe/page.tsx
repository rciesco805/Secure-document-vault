import { Suspense } from "react";
import { Metadata } from "next";
import UnsubscribePageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Unsubscribe | BF Fund",
  description: "Unsubscribe from notifications",
};

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <UnsubscribePageClient />
    </Suspense>
  );
}
