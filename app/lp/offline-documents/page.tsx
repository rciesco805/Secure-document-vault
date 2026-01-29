import { Metadata } from "next";
import { Suspense } from "react";

import OfflineDocumentsClient from "./page-client";

export const metadata: Metadata = {
  title: "Offline Documents | BF Fund",
  description: "View and manage your offline documents",
};

export default function OfflineDocumentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <OfflineDocumentsClient />
    </Suspense>
  );
}
