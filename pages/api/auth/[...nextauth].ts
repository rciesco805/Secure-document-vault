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
  return {
    ...authOptions,
    callbacks: {
      ...authOptions.callbacks,
      signIn: async ({ user }) => {
        console.log("[AUTH] signIn callback called for:", user.email);
        
        if (!user.email || (await isBlacklistedEmail(user.email))) {
          console.log("[AUTH] User blocked - no email or blacklisted");
          await identifyUser(user.email ?? user.id);
          await trackAnalytics({
            event: "User Sign In Attempted",
            email: user.email ?? undefined,
            userId: user.id,
          });
          return false;
        }

        // Check if user is an admin
        const emailLower = user.email.toLowerCase();
        const isAdmin = isAdminEmail(emailLower);
        console.log("[AUTH] Admin email check:", emailLower, "isAdmin:", isAdmin);
        
        // If admin, allow access immediately
        if (isAdmin) {
          console.log("[AUTH] Admin access granted for:", emailLower);
        } else {
          // Check if user is a member of any viewer group (added via quick link or invite)
          const viewerWithGroups = await prisma.viewer.findFirst({
            where: {
              email: { equals: emailLower, mode: "insensitive" },
              groups: {
                some: {}
              }
            },
            select: { id: true, email: true }
          });
          
          console.log("[AUTH] Viewer group membership check:", emailLower, "found:", !!viewerWithGroups);
          
          // Also check if email is in any link's allowList (UI adds members this way)
          let isInAllowList = false;
          if (!viewerWithGroups) {
            const linkWithEmail = await prisma.link.findFirst({
              where: {
                allowList: { has: emailLower },
                deletedAt: null,
                isArchived: false,
              },
              select: { id: true }
            });
            isInAllowList = !!linkWithEmail;
            console.log("[AUTH] Link allowList check:", emailLower, "found:", isInAllowList);
          }
          
          if (!viewerWithGroups && !isInAllowList) {
            console.log("[AUTH] Unauthorized - email not admin, not in any viewer group, and not in any allowList");
            log({
              message: `Unauthorized login attempt: ${user.email}`,
              type: "error",
            });
            return false;
          }
          
          console.log("[AUTH] Access granted via", viewerWithGroups ? "viewer group membership" : "link allowList", "for:", emailLower);
        }

        // Apply rate limiting for signin attempts (optional - skip if Redis unavailable)
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

        console.log("[AUTH] Sign-in allowed for:", user.email);
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
