"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useEffect } from "react";

import LoadingSpinner from "@/components/ui/loading-spinner";

export default function BillingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    router.replace("/settings/general");
  }, [router]);

  return null;
}
