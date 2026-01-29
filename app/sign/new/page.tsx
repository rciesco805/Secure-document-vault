import { Suspense } from "react";
import { Metadata } from "next";
import NewSignatureDocumentClient from "./page-client";

export const metadata: Metadata = {
  title: "New Signature Document | BF Fund",
  description: "Upload a document and add recipients for e-signature",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function NewSignatureDocumentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewSignatureDocumentClient />
    </Suspense>
  );
}
