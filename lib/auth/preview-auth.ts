import crypto from "crypto";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const PREVIEW_EXPIRATION_TIME = 20 * 60 * 1000; // 20 minutes

const ZPreviewSessionSchema = z.object({
  userId: z.string(),
  linkId: z.string(),
  expiresAt: z.number(),
});

type PreviewSession = z.infer<typeof ZPreviewSessionSchema>;

async function createPreviewSession(
  linkId: string,
  userId: string,
): Promise<{ token: string; expiresAt: number }> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + PREVIEW_EXPIRATION_TIME;

  const sessionData: PreviewSession = {
    linkId,
    userId,
    expiresAt,
  };

  // Validate session data before storing
  ZPreviewSessionSchema.parse(sessionData);

  if (redis) {
    // Store session in Redis
    await redis.set(
      `preview_session:${sessionToken}`,
      JSON.stringify(sessionData),
      { pxat: expiresAt },
    );
  } else {
    // Fallback to database storage using VerificationToken table
    // identifier: short key for lookups (preview:sessionToken)
    // token: JSON payload (token field has no length limit)
    await prisma.verificationToken.create({
      data: {
        identifier: `preview:${sessionToken}`,
        token: JSON.stringify(sessionData),
        expires: new Date(expiresAt),
      },
    });
  }

  return {
    token: sessionToken,
    expiresAt,
  };
}

async function verifyPreviewSession(
  previewToken: string,
  userId: string,
  linkId: string,
): Promise<PreviewSession | null> {
  const sessionToken = previewToken;
  if (!sessionToken) return null;

  let sessionData: PreviewSession | null = null;

  if (redis) {
    const session = await redis.get(`preview_session:${sessionToken}`);
    if (session) {
      try {
        sessionData = ZPreviewSessionSchema.parse(
          typeof session === "string" ? JSON.parse(session) : session
        );
      } catch {
        await redis.del(`preview_session:${sessionToken}`);
        return null;
      }
    }
  } else {
    // Database fallback: lookup by identifier (preview:sessionToken)
    const dbSession = await prisma.verificationToken.findFirst({
      where: {
        identifier: `preview:${sessionToken}`,
      },
    });

    if (dbSession) {
      try {
        // Parse JSON from token field
        sessionData = ZPreviewSessionSchema.parse(JSON.parse(dbSession.token));
      } catch {
        await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: dbSession.identifier,
              token: dbSession.token,
            },
          },
        });
        return null;
      }
    }
  }

  if (!sessionData) return null;

  // Helper to delete session
  const deleteSession = async () => {
    if (redis) {
      await redis.del(`preview_session:${sessionToken}`);
    } else {
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: `preview:${sessionToken}`,
        },
      });
    }
  };

  // Check if the session is for the correct user
  if (sessionData.userId !== userId) {
    await deleteSession();
    return null;
  }

  // Check if session is expired
  if (sessionData.expiresAt < Date.now()) {
    await deleteSession();
    return null;
  }

  // Check if the session is for the correct link
  if (sessionData.linkId !== linkId) {
    await deleteSession();
    return null;
  }

  return sessionData;
}

export { createPreviewSession, verifyPreviewSession };
export type { PreviewSession };
