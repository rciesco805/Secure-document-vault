import prisma from "@/lib/prisma";
import { hashToken } from "./token";

export interface ApiTokenValidation {
  valid: boolean;
  teamId?: string;
  userId?: string;
  tokenId?: string;
  error?: string;
}

export async function validateApiToken(authHeader: string | undefined): Promise<ApiTokenValidation> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }
  
  const token = authHeader.slice(7);
  
  if (!token) {
    return { valid: false, error: "Token is required" };
  }

  const hashedKey = hashToken(token);
  
  const apiToken = await prisma.restrictedToken.findFirst({
    where: {
      hashedKey,
      OR: [
        { expires: null },
        { expires: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      scopes: true,
    },
  });
  
  if (!apiToken) {
    return { valid: false, error: "Invalid or expired token" };
  }
  
  await prisma.restrictedToken.update({
    where: { id: apiToken.id },
    data: { lastUsed: new Date() },
  });
  
  return { 
    valid: true, 
    teamId: apiToken.teamId, 
    userId: apiToken.userId,
    tokenId: apiToken.id,
  };
}
