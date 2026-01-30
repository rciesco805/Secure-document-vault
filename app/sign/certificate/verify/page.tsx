import { Suspense } from "react";
import { Metadata } from "next";
import CertificateVerifyClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify Certificate | BF Fund",
  description: "Verify the authenticity of a completion certificate",
};

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function CertificateVerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CertificateVerifyClient />
    </Suspense>
  );
}
