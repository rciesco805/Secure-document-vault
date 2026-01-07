import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { constructLinkUrl } from "@/lib/utils/link-url";

import { authOptions } from "./api/auth/[...nextauth]";
import { isAdminEmail } from "@/lib/constants/admins";

export default function ViewerRedirect() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white mx-auto"></div>
        <p className="text-gray-400">Redirecting to your dataroom...</p>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const user = session.user as CustomUser;
  const userEmail = user.email!.toLowerCase();

  if (isAdminEmail(userEmail)) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const userTeam = await prisma.userTeam.findFirst({
    where: { userId: user.id },
  });

  if (userTeam) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const viewer = await prisma.viewer.findFirst({
    where: {
      email: { equals: userEmail, mode: "insensitive" },
    },
    include: {
      groups: {
        include: {
          group: {
            include: {
              links: {
                where: {
                  deletedAt: null,
                  isArchived: false,
                },
                select: {
                  id: true,
                  domainId: true,
                  domainSlug: true,
                  slug: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (viewer) {
    for (const membership of viewer.groups) {
      const link = membership.group.links[0];
      if (link) {
        const linkUrl = constructLinkUrl(link);
        return {
          redirect: {
            destination: linkUrl,
            permanent: false,
          },
        };
      }
    }
  }

  const linkWithEmail = await prisma.link.findFirst({
    where: {
      allowList: { has: userEmail },
      deletedAt: null,
      isArchived: false,
      dataroomId: { not: null },
    },
    select: {
      id: true,
      domainId: true,
      domainSlug: true,
      slug: true,
    },
  });

  if (linkWithEmail) {
    const linkUrl = constructLinkUrl(linkWithEmail);
    return {
      redirect: {
        destination: linkUrl,
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: "/viewer-portal",
      permanent: false,
    },
  };
}
