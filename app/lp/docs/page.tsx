import { Metadata } from "next";
import { Suspense } from "react";

import LPDocsClient from "./page-client";

export const metadata: Metadata = {
  title: "My Documents | BF Fund",
  description: "Your secure document vault - all signed agreements and fund documents",
};

export default function LPDocsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <LPDocsClient />
    </Suspense>
  );
}
