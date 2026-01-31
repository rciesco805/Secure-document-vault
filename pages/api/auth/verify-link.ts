import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";
import { generateChecksum } from "@/lib/utils/generate-checksum";
import prisma from "@/lib/prisma";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, checksum, action } = req.body;
  const isValidateOnly = action === "validate";

  console.log("[VERIFY-LINK] Request:", { 
    hasId: !!id, 
    hasChecksum: !!checksum,
    action: action || "sign_in"
  });

  if (!id || !checksum) {
    return res.status(400).json({ valid: false, error: "Missing required parameters" });
  }

  try {
    const expectedChecksum = generateChecksum(id);
    const checksumMatch = checksum === expectedChecksum;
    
    if (!checksumMatch) {
      console.log("[VERIFY-LINK] Checksum mismatch");
      return res.status(400).json({ valid: false, error: "Invalid verification link" });
    }

    const magicLink = await prisma.magicLinkCallback.findUnique({
      where: { token: id },
    });

    if (!magicLink) {
      console.log("[VERIFY-LINK] MagicLinkCallback not found");
      return res.status(400).json({ 
        valid: false, 
        error: "This link has already been used or is invalid. Please request a new login link." 
      });
    }

    if (magicLink.consumed) {
      console.log("[VERIFY-LINK] Link already consumed");
      return res.status(400).json({ 
        valid: false, 
        error: "This link has already been used. Please request a new login link." 
      });
    }

    if (magicLink.expires < new Date()) {
      console.log("[VERIFY-LINK] Link expired:", magicLink.expires);
      await prisma.magicLinkCallback.delete({ where: { id: magicLink.id } });
      return res.status(400).json({ 
        valid: false, 
        error: "This link has expired. Please request a new login link." 
      });
    }

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: magicLink.identifier,
        expires: { gt: new Date() },
      },
    });
    
    if (!verificationToken) {
      console.log("[VERIFY-LINK] NextAuth token not found or expired");
      await prisma.magicLinkCallback.delete({ where: { id: magicLink.id } });
      return res.status(400).json({ 
        valid: false, 
        error: "This link has expired. Please request a new login link." 
      });
    }

    const tokenHash = hashToken(verificationToken.token);
    if (tokenHash !== magicLink.authTokenHash) {
      console.log("[VERIFY-LINK] Token hash mismatch - original token may have been replaced");
      await prisma.magicLinkCallback.delete({ where: { id: magicLink.id } });
      return res.status(400).json({ 
        valid: false, 
        error: "This link is no longer valid. A newer login link may have been requested. Please check for the latest email or request a new link." 
      });
    }

    if (isValidateOnly) {
      console.log("[VERIFY-LINK] Validate only - link is valid for:", magicLink.identifier);
      return res.json({ valid: true });
    }

    await prisma.magicLinkCallback.update({
      where: { id: magicLink.id },
      data: { consumed: true },
    });

    console.log("[VERIFY-LINK] Link consumed, returning callback URL for:", magicLink.identifier);

    return res.json({ 
      valid: true, 
      callbackUrl: magicLink.callbackUrl 
    });
  } catch (error) {
    console.error("[VERIFY-LINK] Validation error:", error);
    return res.status(400).json({ valid: false, error: "Invalid verification link" });
  }
}
