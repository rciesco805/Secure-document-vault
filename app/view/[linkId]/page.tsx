import { Suspense } from "react";
import { Metadata } from "next";
import LinkViewClient from "./page-client";

export const metadata: Metadata = {
  title: "View Document | BF Fund",
  description: "Securely view shared documents",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function LinkViewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LinkViewClient />
    </Suspense>
  );
}
