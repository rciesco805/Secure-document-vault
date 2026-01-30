import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { isAdminEmail } from "@/lib/constants/admins";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  const emailLower = email.toLowerCase().trim();

  // First check static admin list
  if (isAdminEmail(emailLower)) {
    return res.status(200).json({ isAdmin: true });
  }

  // Then check database for admin roles (OWNER, SUPER_ADMIN, ADMIN)
  try {
    const adminTeam = await prisma.userTeam.findFirst({
      where: {
        user: { email: { equals: emailLower, mode: "insensitive" } },
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
    });

    return res.status(200).json({ isAdmin: !!adminTeam });
  } catch (error) {
    console.error("[CHECK_ADMIN] Error checking admin status:", error);
    // Fall back to static check only
    return res.status(200).json({ isAdmin: isAdminEmail(emailLower) });
  }
}
