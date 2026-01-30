"use client";

import LoadingSpinner from "@/components/ui/loading-spinner";

export default function ViewerRedirectPageClient() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white mx-auto"></div>
        <p className="text-gray-400">Redirecting to your dataroom...</p>
      </div>
    </div>
  );
}
