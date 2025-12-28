import { randomUUID } from "crypto";

import prisma from "@/lib/prisma";

const VISITOR_MAGIC_LINK_EXPIRY_MINUTES = 20;
export const INVITATION_MAGIC_LINK_EXPIRY_MINUTES = 60; // 1 hour for email invitations

export async function createVisitorMagicLink({
  email,
  linkId,
  isDataroom,
  baseUrl,
  expiryMinutes,
}: {
  email: string;
  linkId: string;
  isDataroom: boolean;
  baseUrl: string;
  expiryMinutes?: number;
}): Promise<{ magicLink: string; token: string } | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const token = randomUUID();
    const expiryTime = expiryMinutes || VISITOR_MAGIC_LINK_EXPIRY_MINUTES;
    const expires = new Date(Date.now() + expiryTime * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: `visitor-magic:${linkId}:${normalizedEmail}`,
        token: token,
        expires,
      },
    });

    const params = new URLSearchParams({
      token,
      email: normalizedEmail,
    });

    const magicLink = `${baseUrl}/view/${linkId}?${params.toString()}`;
    console.log("[VISITOR_MAGIC_LINK] Created magic link for:", normalizedEmail, "linkId:", linkId);
    
    return { magicLink, token };
  } catch (error) {
    console.error("[VISITOR_MAGIC_LINK] Error creating magic link:", error);
    return null;
  }
}

export async function verifyVisitorMagicLink({
  token,
  email,
  linkId,
}: {
  token: string;
  email: string;
  linkId: string;
}): Promise<boolean> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const verification = await prisma.verificationToken.findUnique({
      where: {
        token: token,
        identifier: `visitor-magic:${linkId}:${normalizedEmail}`,
      },
    });

    if (!verification) {
      return false;
    }

    if (verification.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token: token },
      });
      return false;
    }

    await prisma.verificationToken.delete({
      where: { token: token },
    });

    return true;
  } catch (error) {
    console.error("[VISITOR_MAGIC_LINK] Error verifying magic link:", error);
    return false;
  }
}
