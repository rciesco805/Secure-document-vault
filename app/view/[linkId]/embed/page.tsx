import { Suspense } from "react";
import { Metadata } from "next";
import EmbedViewClient from "./page-client";

export const metadata: Metadata = {
  title: "Embedded Document | BF Fund",
  description: "Embedded document viewer",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function EmbedViewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmbedViewClient />
    </Suspense>
  );
}
