"use client";

import { useRouter } from "next/navigation";
import WorkflowNew from "@/ee/features/workflows/pages/workflow-new";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function WorkflowNewPageClient() {
  const router = useRouter();
  return <WorkflowNew />;
}
