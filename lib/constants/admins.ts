import prisma from "@/lib/prisma";

// Default admin email as fallback when no team admins exist
export const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || "investors@bermudafranchisegroup.com";

// Legacy constant for backwards compatibility - prefer using getTeamAdminEmails()
export const ADMIN_EMAILS = [
  DEFAULT_ADMIN_EMAIL,
] as const;

/**
 * Get admin emails for a specific team from the database
 * Returns users with OWNER, ADMIN, or SUPER_ADMIN roles
 */
export async function getTeamAdminEmails(teamId: string): Promise<string[]> {
  try {
    const teamAdmins = await prisma.userTeam.findMany({
      where: {
        teamId,
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    const adminEmails = teamAdmins
      .map((ut) => ut.user.email)
      .filter((email): email is string => !!email);

    // Fallback to default admin if no team admins found
    if (adminEmails.length === 0) {
      return [DEFAULT_ADMIN_EMAIL];
    }

    return adminEmails;
  } catch (error) {
    console.error("Error fetching team admin emails:", error);
    return [DEFAULT_ADMIN_EMAIL];
  }
}

/**
 * Get all admin emails across all teams (for system-wide notifications)
 */
export async function getAllAdminEmails(): Promise<string[]> {
  try {
    const allAdmins = await prisma.userTeam.findMany({
      where: {
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
      include: {
        user: {
          select: { email: true },
        },
      },
      distinct: ["userId"],
    });

    const adminEmails = allAdmins
      .map((ut) => ut.user.email)
      .filter((email): email is string => !!email);

    // Fallback to default admin if no admins found
    if (adminEmails.length === 0) {
      return [DEFAULT_ADMIN_EMAIL];
    }

    return [...new Set(adminEmails)]; // Deduplicate
  } catch (error) {
    console.error("Error fetching all admin emails:", error);
    return [DEFAULT_ADMIN_EMAIL];
  }
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase().trim());
}

/**
 * Check if a user is an admin of any team (async database lookup)
 * Checks for OWNER, ADMIN, or SUPER_ADMIN roles
 */
export async function isUserAdminAsync(email: string): Promise<boolean> {
  // First check static list
  if (isAdminEmail(email)) {
    return true;
  }
  
  // Then check database
  try {
    const adminTeam = await prisma.userTeam.findFirst({
      where: {
        user: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } },
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
    });
    return !!adminTeam;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return isAdminEmail(email);
  }
}

/**
 * Check if a user is an admin of a specific team
 */
export async function isTeamAdmin(email: string, teamId: string): Promise<boolean> {
  try {
    const userTeam = await prisma.userTeam.findFirst({
      where: {
        teamId,
        user: { email: email.toLowerCase().trim() },
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
    });
    return !!userTeam;
  } catch (error) {
    console.error("Error checking team admin status:", error);
    return false;
  }
}
