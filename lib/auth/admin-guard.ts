import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "@/lib/auth/auth-options";

export interface AdminPortalGuardResult {
  session: any;
  user: CustomUser;
  userTeam: any;
  loginPortal: "ADMIN" | "VISITOR";
}

export async function requireAdminPortalAccess(): Promise<AdminPortalGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  const user = session.user as CustomUser;
  
  // Get the session token from cookies and look up the specific session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("next-auth.session-token")?.value;
  
  let loginPortal: "ADMIN" | "VISITOR" = "VISITOR";
  
  if (sessionToken) {
    const dbSession = await prisma.session.findUnique({
      where: { sessionToken },
    });
    loginPortal = ((dbSession as any)?.loginPortal as "ADMIN" | "VISITOR") || "VISITOR";
  }

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: user.id,
      role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
  });

  if (!userTeam) {
    redirect("/viewer-portal");
  }

  if (loginPortal !== "ADMIN") {
    redirect("/viewer-portal?error=wrong_portal");
  }

  return { session, user, userTeam, loginPortal };
}

export type AdminGuardResult =
  | { redirect: { destination: string; permanent: boolean } }
  | { props: Record<string, unknown> };

export async function requireAdminAccess(
  context: GetServerSidePropsContext
): Promise<AdminGuardResult> {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const user = session.user as CustomUser;

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!userTeam) {
    return {
      redirect: {
        destination: "/viewer-portal",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export function withAdminGuard<P extends { [key: string]: unknown } = {}>(
  getServerSidePropsFunc?: (
    context: GetServerSidePropsContext
  ) => Promise<GetServerSidePropsResult<P>>
) {
  return async function getServerSideProps(
    context: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> {
    const guardResult = await requireAdminAccess(context);

    if ("redirect" in guardResult) {
      return guardResult;
    }

    if (getServerSidePropsFunc) {
      return getServerSidePropsFunc(context);
    }

    return { props: {} as P };
  };
}
