import { randomUUID } from "crypto";

import { ADMIN_EMAILS, isAdminEmail } from "@/lib/constants/admins";
import prisma from "@/lib/prisma";

const ADMIN_MAGIC_LINK_EXPIRY_MINUTES = 60; // 1 hour expiry for admin magic links

export async function createAdminMagicLink({
  email,
  redirectPath,
  baseUrl,
}: {
  email: string;
  redirectPath?: string;
  baseUrl: string;
}): Promise<{ magicLink: string; token: string } | null> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!isAdminEmail(normalizedEmail)) {
      console.error("[ADMIN_MAGIC_LINK] Email not in admin list:", normalizedEmail);
      return null;
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + ADMIN_MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: `admin-magic:${normalizedEmail}`,
        token: token,
        expires,
      },
    });

    const params = new URLSearchParams({
      token,
      email: normalizedEmail,
    });
    
    if (redirectPath) {
      params.set("redirect", redirectPath);
    }

    const magicLink = `${baseUrl}/api/auth/admin-magic-verify?${params.toString()}`;
    console.log("[ADMIN_MAGIC_LINK] Created magic link for:", normalizedEmail);
    
    return { magicLink, token };
  } catch (error) {
    console.error("[ADMIN_MAGIC_LINK] Error creating magic link:", error);
    return null;
  }
}

export async function verifyAdminMagicLink({
  token,
  email,
}: {
  token: string;
  email: string;
}): Promise<boolean> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!isAdminEmail(normalizedEmail)) {
      return false;
    }

    const verification = await prisma.verificationToken.findUnique({
      where: {
        token: token,
        identifier: `admin-magic:${normalizedEmail}`,
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
    console.error("[ADMIN_MAGIC_LINK] Error verifying magic link:", error);
    return false;
  }
}
