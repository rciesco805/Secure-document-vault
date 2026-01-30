import { Suspense } from "react";
import { Metadata } from "next";
import SignatureDashboardClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "E-Signature | BF Fund",
  description: "Send documents for signature and track their status",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function SignatureDashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignatureDashboardClient />
    </Suspense>
  );
}
