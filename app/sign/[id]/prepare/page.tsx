import { Suspense } from "react";
import { Metadata } from "next";
import PrepareDocumentClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prepare Document | BF Fund",
  description: "Place signature fields on your document",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function PrepareDocumentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PrepareDocumentClient />
    </Suspense>
  );
}
