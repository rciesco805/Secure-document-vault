import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { constructLinkUrl } from "@/lib/utils/link-url";

import { authOptions } from "./api/auth/[...nextauth]";

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

  // Check if visitor mode is requested (admins testing the visitor experience)
  const visitorMode = context.query.mode === "visitor";

  // Only redirect to admin dashboard if NOT in visitor mode
  if (!visitorMode) {
    const userTeam = await prisma.userTeam.findFirst({
      where: { userId: user.id },
    });

    if (userTeam) {
      return {
        redirect: {
          destination: "/hub",
          permanent: false,
        },
      };
    }
    
    // Check if user is an LP investor
    const investor = await prisma.investor.findUnique({
      where: { userId: user.id },
    });

    if (investor) {
      return {
        redirect: {
          destination: "/lp/dashboard",
          permanent: false,
        },
      };
    }
  }

  // For visitor mode or non-admin users, find their viewer access
  const viewer = await prisma.viewer.findFirst({
    where: {
      email: { equals: userEmail, mode: "insensitive" },
    },
    include: {
      groups: {
        include: {
          group: {
            include: {
              dataroom: {
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
      },
    },
  });

  if (viewer) {
    for (const membership of viewer.groups) {
      const dataroom = membership.group.dataroom;
      const link = dataroom?.links?.[0];
      if (link) {
        const linkUrl = constructLinkUrl(link);
        console.log("[VIEWER_REDIRECT] Found link for viewer:", userEmail, "->", linkUrl);
        return {
          redirect: {
            destination: linkUrl,
            permanent: false,
          },
        };
      }
    }
    console.log("[VIEWER_REDIRECT] Viewer found but no dataroom links:", userEmail);
  } else {
    console.log("[VIEWER_REDIRECT] No viewer record found:", userEmail);
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
    console.log("[VIEWER_REDIRECT] Found allowList link for:", userEmail, "->", linkUrl);
    return {
      redirect: {
        destination: linkUrl,
        permanent: false,
      },
    };
  }

  console.log("[VIEWER_REDIRECT] No access found, redirecting to portal:", userEmail);
  return {
    redirect: {
      destination: "/viewer-portal",
      permanent: false,
    },
  };
}
