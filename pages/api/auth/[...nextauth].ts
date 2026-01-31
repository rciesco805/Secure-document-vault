import { NextApiRequest, NextApiResponse } from "next";

import { checkRateLimit, rateLimiters } from "@/ee/features/security";
import NextAuth, { type NextAuthOptions } from "next-auth";

import { identifyUser, trackAnalytics } from "@/lib/analytics";
import { authOptions } from "@/lib/auth/auth-options";
import { isAdminEmail } from "@/lib/constants/admins";
import { dub } from "@/lib/dub";
import { isBlacklistedEmail } from "@/lib/edge-config/blacklist";
import prisma from "@/lib/prisma";
import { log } from "@/lib/utils";
import { getIpAddress } from "@/lib/utils/ip";

export { authOptions };

export const config = {
  maxDuration: 180,
};

const getAuthOptions = (req: NextApiRequest): NextAuthOptions => {
  const callbackUrlFromCookie = req.cookies?.["next-auth.callback-url"] || "";
  const callbackUrlFromQuery = typeof req.query?.callbackUrl === "string" ? req.query.callbackUrl : "";
  const callbackUrl = callbackUrlFromQuery || callbackUrlFromCookie;
  
  const isAdminPortalRequest = callbackUrl.includes("/dashboard") || 
                               callbackUrl.includes("/admin") ||
                               callbackUrl.includes("/datarooms") ||
                               callbackUrl.includes("/documents") ||
                               callbackUrl.includes("/settings");
  
  console.log("[AUTH] Portal detection:", { callbackUrl, isAdminPortalRequest });

  return {
    ...authOptions,
    callbacks: {
      ...authOptions.callbacks,
      signIn: async ({ user, account, email }) => {
        if (!user.email || (await isBlacklistedEmail(user.email))) {
          await identifyUser(user.email ?? user.id);
          await trackAnalytics({
            event: "User Sign In Attempted",
            email: user.email ?? undefined,
            userId: user.id,
          });
          return false;
        }

        const emailLower = user.email.toLowerCase();
        
        let isAdmin = isAdminEmail(emailLower);
        if (!isAdmin) {
          const adminTeam = await prisma.userTeam.findFirst({
            where: {
              user: { email: { equals: emailLower, mode: "insensitive" } },
              role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
              status: "ACTIVE",
            },
          });
          isAdmin = !!adminTeam;
        }
        
        console.log("[AUTH] User check:", emailLower, "isAdmin:", isAdmin, "isAdminPortalRequest:", isAdminPortalRequest);
        
        if (isAdminPortalRequest) {
          if (!isAdmin) {
            console.log("[AUTH] Non-admin trying to access admin portal:", emailLower);
            log({
              message: `Access denied: ${user.email} attempted admin portal login without admin role`,
              type: "error",
            });
            return "/admin/login?error=AccessDenied&message=You+do+not+have+admin+access.+Please+use+the+investor+portal.";
          }
          console.log("[AUTH] Admin access granted for:", emailLower);
          return true;
        }
        
        const [existingViewer, viewerWithGroups, linkWithEmail] = await prisma.$transaction([
          prisma.viewer.findFirst({
            where: {
              email: { equals: emailLower, mode: "insensitive" },
              accessRevokedAt: null,
            },
            select: { id: true, email: true, teamId: true }
          }),
          prisma.viewer.findFirst({
            where: {
              email: { equals: emailLower, mode: "insensitive" },
              groups: { some: {} }
            },
            select: { id: true, email: true }
          }),
          prisma.link.findFirst({
            where: {
              allowList: { has: emailLower },
              deletedAt: null,
              isArchived: false,
            },
            select: { id: true, name: true }
          }),
        ]);
        
        const hasViewerAccess = !!(existingViewer || viewerWithGroups || linkWithEmail);
        
        console.log("[AUTH] Viewer authorization for:", emailLower, {
          existingViewer: !!existingViewer,
          viewerWithGroups: !!viewerWithGroups,
          linkAllowList: !!linkWithEmail,
          hasViewerAccess,
          isAdmin,
        });
        
        if (!hasViewerAccess && !isAdmin) {
          log({
            message: `Unauthorized login attempt: ${user.email} - not a viewer, not in group, not in allowList`,
            type: "error",
          });
          return "/login?error=AccessDenied&message=You+do+not+have+access+to+this+portal.+Please+contact+an+administrator.";
        }
        
        const accessMethod = hasViewerAccess 
          ? (existingViewer ? "viewer record" : (viewerWithGroups ? "group membership" : "link allowList"))
          : "admin role";
        console.log("[AUTH] Visitor portal access granted via", accessMethod, "for:", emailLower);

        try {
          if (req && rateLimiters?.auth) {
            const clientIP = getIpAddress(req.headers);
            const rateLimitResult = await checkRateLimit(
              rateLimiters.auth,
              clientIP,
            );

            if (!rateLimitResult.success) {
              console.log("[AUTH] Rate limit exceeded for:", clientIP);
              log({
                message: `Rate limit exceeded for IP ${clientIP} during signin attempt`,
                type: "error",
              });
              return false;
            }
          }
        } catch (error) {
          console.log("[AUTH] Rate limit check skipped:", error);
        }

        return true;
      },
    },
    events: {
      ...authOptions.events,
      signIn: async (message) => {
        // Identify and track sign-in without blocking the event flow
        await Promise.allSettled([
          identifyUser(message.user.email ?? message.user.id),
          trackAnalytics({
            event: "User Signed In",
            email: message.user.email,
          }),
        ]);

        if (message.isNewUser) {
          const { dub_id } = req.cookies;
          // Only fire lead event if Dub is enabled
          if (dub_id && process.env.DUB_API_KEY) {
            try {
              await dub.track.lead({
                clickId: dub_id,
                eventName: "Sign Up",
                customerExternalId: message.user.id,
                customerName: message.user.name,
                customerEmail: message.user.email,
                customerAvatar: message.user.image ?? undefined,
              });
            } catch (err) {
              console.error("dub.track.lead failed", err);
            }
          }
        }
      },
    },
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return NextAuth(req, res, getAuthOptions(req));
}
