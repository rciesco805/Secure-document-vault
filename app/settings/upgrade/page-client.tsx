"use client";

import { useRouter } from "next/navigation";

import { useEffect } from "react";

import LoadingSpinner from "@/components/ui/loading-spinner";

export default function UpgradePageClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/general");
  }, [router]);

  return null;
}
