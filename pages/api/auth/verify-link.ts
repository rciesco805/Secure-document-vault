import { NextApiRequest, NextApiResponse } from "next";
import { generateChecksum } from "@/lib/utils/generate-checksum";

function normalizeOrigin(urlString: string): string {
  try {
    const url = new URL(urlString);
    return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`.toLowerCase();
  } catch {
    return '';
  }
}

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const verificationBaseUrl = process.env.VERIFICATION_EMAIL_BASE_URL;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (nextAuthUrl) origins.push(normalizeOrigin(nextAuthUrl));
  if (verificationBaseUrl) origins.push(normalizeOrigin(verificationBaseUrl));
  if (publicBaseUrl) origins.push(normalizeOrigin(publicBaseUrl));
  
  origins.push('https://dataroom.bermudafranchisegroup.com');
  
  return [...new Set(origins.filter(o => o))];
}

function isValidNextAuthCallbackPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth/callback/');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { verification_url, checksum } = req.body;

  console.log("[VERIFY-LINK] Validating link:", { 
    hasUrl: !!verification_url, 
    hasChecksum: !!checksum 
  });

  if (!verification_url || !checksum) {
    return res.status(400).json({ valid: false, error: "Missing required parameters" });
  }

  try {
    const urlObj = new URL(verification_url);
    const urlOrigin = normalizeOrigin(verification_url);
    const allowedOrigins = getAllowedOrigins();
    
    console.log("[VERIFY-LINK] Origin check:", { 
      urlOrigin, 
      allowedOrigins,
      isAllowed: allowedOrigins.includes(urlOrigin)
    });
    
    if (!allowedOrigins.includes(urlOrigin)) {
      console.log("[VERIFY-LINK] Origin not in allowed list");
      return res.status(400).json({ valid: false, error: "Invalid origin" });
    }
    
    if (!isValidNextAuthCallbackPath(urlObj.pathname)) {
      console.log("[VERIFY-LINK] Invalid callback path:", urlObj.pathname);
      return res.status(400).json({ valid: false, error: "Invalid callback path" });
    }
    
    const expectedChecksum = generateChecksum(verification_url);
    const checksumMatch = checksum === expectedChecksum;
    
    console.log("[VERIFY-LINK] Checksum match:", checksumMatch);
    
    if (!checksumMatch) {
      return res.status(400).json({ valid: false, error: "Invalid checksum" });
    }

    return res.json({ valid: true });
  } catch (error) {
    console.error("[VERIFY-LINK] Validation error:", error);
    return res.status(400).json({ valid: false, error: "Invalid verification URL" });
  }
}
