import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import ConversationDetailPageClient from "./page-client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export const metadata: Metadata = {
  title: "Conversation | Dataroom | BF Fund",
  description: "View conversation details",
};

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string; conversationId: string }>;
}) {
  const session = await getServerSession(authOptions);

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

  const { id, conversationId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      }
    >
      <ConversationDetailPageClient id={id} conversationId={conversationId} />
    </Suspense>
  );
}
