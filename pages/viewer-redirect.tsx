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
  console.log("[VIEWER_REDIRECT] getServerSideProps called");
  
  const session = await getServerSession(context.req, context.res, authOptions);
  
  console.log("[VIEWER_REDIRECT] Session check:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    email: session?.user?.email,
  });

  if (!session?.user?.email) {
    console.log("[VIEWER_REDIRECT] No session/email, redirecting to login");
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const user = session.user as CustomUser;
  const userEmail = user.email!.toLowerCase();
  const userRole = user.role || "LP";
  
  console.log("[VIEWER_REDIRECT] Processing redirect for:", userEmail, "role:", userRole);

  // Check if visitor mode is requested (admins testing the visitor experience)
  const visitorMode = context.query.mode === "visitor";

  // Role-based routing (unless visitor mode is requested)
  if (!visitorMode) {
    // GP users go to admin hub
    if (userRole === "GP") {
      const userTeam = await prisma.userTeam.findFirst({
        where: { userId: user.id },
      });

      if (userTeam) {
        console.log("[VIEWER_REDIRECT] GP user with team, redirecting to hub");
        return {
          redirect: {
            destination: "/hub",
            permanent: false,
          },
        };
      }
    }
    
    // LP users go to LP dashboard if they have an investor profile
    if (userRole === "LP") {
      const investor = await prisma.investor.findUnique({
        where: { userId: user.id },
      });

      if (investor) {
        console.log("[VIEWER_REDIRECT] LP user with investor profile, redirecting to LP dashboard");
        return {
          redirect: {
            destination: "/lp/dashboard",
            permanent: false,
          },
        };
      }
    }
    
    // Check team membership for any user (admins without GP role set yet)
    const userTeam = await prisma.userTeam.findFirst({
      where: { userId: user.id },
    });

    if (userTeam) {
      console.log("[VIEWER_REDIRECT] User with team membership, redirecting to hub");
      return {
        redirect: {
          destination: "/hub",
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
