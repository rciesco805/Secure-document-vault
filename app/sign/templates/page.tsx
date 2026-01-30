import { Suspense } from "react";
import { Metadata } from "next";
import TemplatesPageClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signature Templates | BF Fund",
  description: "Reusable document templates for quick e-signature",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TemplatesPageClient />
    </Suspense>
  );
}
