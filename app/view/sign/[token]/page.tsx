import { Suspense } from "react";
import { Metadata } from "next";
import SignDocumentClient from "./page-client";

export const metadata: Metadata = {
  title: "Sign Document | BF Fund",
  description: "Review and sign your document electronically",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function SignDocumentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignDocumentClient />
    </Suspense>
  );
}
