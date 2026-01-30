"use client";

import { useRouter } from "next/navigation";
import WorkflowOverview from "@/ee/features/workflows/pages/workflow-overview";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function WorkflowsPageClient() {
  const router = useRouter();
  return <WorkflowOverview />;
}
