import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import FundDetailPageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Fund Details | GP Admin",
  description: "View fund details and investor activity",
};

interface FundDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FundDetailPage({ params }: FundDetailPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session) {
    redirect("/login");
  }

  const user = session.user as CustomUser;

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!userTeam) {
    redirect("/viewer-portal");
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <FundDetailPageClient fundId={id} />
    </Suspense>
  );
}
