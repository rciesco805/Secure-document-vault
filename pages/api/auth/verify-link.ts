import { NextApiRequest, NextApiResponse } from "next";
import { generateChecksum } from "@/lib/utils/generate-checksum";
import prisma from "@/lib/prisma";

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
