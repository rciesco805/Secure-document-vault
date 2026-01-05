import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

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
