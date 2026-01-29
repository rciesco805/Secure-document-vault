import { Metadata } from "next";
import { Suspense } from "react";

import LPOnboardClient from "./page-client";

export const metadata: Metadata = {
  title: "Investor Onboarding | BF Fund",
  description: "Register as an investor with BF Fund",
};

export default function LPOnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <LPOnboardClient />
    </Suspense>
  );
}
