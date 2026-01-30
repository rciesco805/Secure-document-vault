"use client";

import { useRouter, useParams } from "next/navigation";
import WorkflowDetail from "@/ee/features/workflows/pages/workflow-detail";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function WorkflowDetailPageClient() {
  const router = useRouter();
  const params = useParams();
  return <WorkflowDetail />;
}
