import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/prisma";

export type UserRole = "LP" | "GP";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  investorId?: string;
  teamIds?: string[];
}

export interface RoleCheckResult {
  user: AuthenticatedUser | null;
  error?: string;
  statusCode?: number;
}

export async function getUserWithRole(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<RoleCheckResult> {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return {
      user: null,
      error: "Not authenticated",
      statusCode: 401,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      role: true,
      investorProfile: {
        select: { id: true },
      },
      teams: {
        select: { teamId: true },
      },
    },
  });

  if (!user) {
    return {
      user: null,
      error: "User not found",
      statusCode: 404,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      role: user.role as UserRole,
      investorId: user.investorProfile?.id,
      teamIds: user.teams.map((t) => t.teamId),
    },
  };
}

export function requireRole(
  allowedRoles: UserRole[],
  result: RoleCheckResult
): { allowed: boolean; error?: string; statusCode?: number } {
  if (!result.user) {
    return {
      allowed: false,
      error: result.error,
      statusCode: result.statusCode,
    };
  }

  if (!allowedRoles.includes(result.user.role)) {
    return {
      allowed: false,
      error: "Insufficient permissions",
      statusCode: 403,
    };
  }

  return { allowed: true };
}

export function filterByInvestorIfLP<T extends { investorId?: string }>(
  user: AuthenticatedUser,
  where: T
): T {
  if (user.role === "LP" && user.investorId) {
    return { ...where, investorId: user.investorId };
  }
  return where;
}
