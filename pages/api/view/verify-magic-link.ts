import { NextApiRequest, NextApiResponse } from "next";

import { hashToken } from "@/lib/api/auth/token";
import { verifyVisitorMagicLink } from "@/lib/auth/create-visitor-magic-link";
import { newId } from "@/lib/id-helper";
import prisma from "@/lib/prisma";
import { authRateLimiter } from "@/lib/security/rate-limiter";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const allowed = await authRateLimiter(req, res);
  if (!allowed) return;

  const { token, email, linkId } = req.body as {
    token: string;
    email: string;
    linkId: string;
  };

  if (!token || !email || !linkId) {
    return res.status(400).json({ 
      verified: false, 
      message: "Missing required parameters" 
    });
  }

  try {
    const isValid = await verifyVisitorMagicLink({
      token,
      email,
      linkId,
    });

    if (isValid) {
      const normalizedEmail = email.trim().toLowerCase();
      
      const link = await prisma.link.findUnique({
        where: { id: linkId },
        select: { teamId: true },
      });
      
      const newToken = newId("email");
      const hashedVerificationToken = hashToken(newToken);
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 23);
      
      await prisma.verificationToken.create({
        data: {
          token: hashedVerificationToken,
          identifier: `link-verification:${linkId}:${link?.teamId}:${normalizedEmail}`,
          expires: tokenExpiresAt,
        },
      });
      
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      
      res.setHeader("Set-Cookie", [
        `pm_vft_${linkId}=${hashedVerificationToken}; Path=/; HttpOnly; SameSite=Strict; Expires=${oneHourFromNow.toUTCString()}`,
        `pm_email_${linkId}=${normalizedEmail}; Path=/; HttpOnly; SameSite=Strict; Expires=${oneHourFromNow.toUTCString()}`,
        `pm_drs_flag_${linkId}=verified; Path=/view/${linkId}; SameSite=Strict; Expires=${oneHourFromNow.toUTCString()}`,
      ]);
      
      return res.status(200).json({ 
        verified: true, 
        email: normalizedEmail 
      });
    } else {
      return res.status(200).json({ 
        verified: false, 
        message: "Invalid or expired magic link" 
      });
    }
  } catch (error) {
    console.error("Magic link verification error:", error);
    return res.status(500).json({ 
      verified: false, 
      message: "Verification failed" 
    });
  }
}
