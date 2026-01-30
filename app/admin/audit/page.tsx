import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/prisma";
import AuditPageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Compliance Audit | BF Fund",
  description: "View and export compliance audit trails",
};

export default async function AuditPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/admin/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!user?.teams?.[0]) {
    redirect("/admin/login");
  }

  const teamMembership = user.teams[0];

  if (!["ADMIN", "OWNER"].includes(teamMembership.role)) {
    redirect("/dashboard");
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <AuditPageClient
        teamId={teamMembership.team.id}
        teamName={teamMembership.team.name || "Your Team"}
      />
    </Suspense>
  );
}
