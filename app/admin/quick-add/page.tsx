import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import QuickAddPageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Quick Add User | BF Fund Dataroom",
  description: "Add investors to a dataroom with one click",
};

interface QuickAddPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function QuickAddPage({ searchParams }: QuickAddPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session) {
    const callbackUrl = params?.email 
      ? `/admin/quick-add?email=${encodeURIComponent(params.email)}`
      : "/admin/quick-add";
    
    redirect(`/login?next=${encodeURIComponent(callbackUrl)}`);
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
      <QuickAddPageClient />
    </Suspense>
  );
}
