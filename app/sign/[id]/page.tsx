import { Suspense } from "react";
import { Metadata } from "next";
import SignatureDocumentDetailClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signature Document | BF Fund",
  description: "View and manage your signature document",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function SignatureDocumentDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignatureDocumentDetailClient />
    </Suspense>
  );
}
