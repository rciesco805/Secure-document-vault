import { Suspense } from "react";
import { Metadata } from "next";
import { requireAdminPortalAccess } from "@/lib/auth/admin-guard";
import FundDashboardClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Fund Dashboard | GP Admin",
  description: "Overview of all funds and investor activity",
};

export default async function FundDashboardPage() {
  await requireAdminPortalAccess();

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <FundDashboardClient />
    </Suspense>
  );
}
