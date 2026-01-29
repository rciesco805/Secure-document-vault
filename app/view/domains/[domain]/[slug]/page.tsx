import { Suspense } from "react";
import { Metadata } from "next";
import DomainViewClient from "./page-client";

export const metadata: Metadata = {
  title: "View Document | BF Fund",
  description: "View shared document",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function DomainViewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DomainViewClient />
    </Suspense>
  );
}
