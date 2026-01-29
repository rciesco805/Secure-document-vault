import { NextApiRequest, NextApiResponse } from "next";

import { verifyAdminMagicLink } from "@/lib/auth/admin-magic-link";
import prisma from "@/lib/prisma";
import { authRateLimiter } from "@/lib/security/rate-limiter";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const allowed = await authRateLimiter(req, res);
  if (!allowed) return;

  const { token, email, redirect } = req.query as {
    token?: string;
    email?: string;
    redirect?: string;
  };

  console.log("[ADMIN_MAGIC_VERIFY] Request received:", { 
    token: token ? "present" : "missing", 
    email,
    redirect,
    host: req.headers.host,
    protocol: req.headers["x-forwarded-proto"] || "http",
  });

  if (!token || !email) {
    console.log("[ADMIN_MAGIC_VERIFY] Missing token or email");
    return res.redirect("/login?error=InvalidLink");
  }

  try {
    const isValid = await verifyAdminMagicLink({ token, email });
    console.log("[ADMIN_MAGIC_VERIFY] Token validation result:", isValid);

    if (!isValid) {
      console.log("[ADMIN_MAGIC_VERIFY] Token invalid or expired");
      return res.redirect("/login?error=ExpiredLink");
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log("[ADMIN_MAGIC_VERIFY] User not found:", email);
      return res.redirect("/login?error=UserNotFound");
    }

    console.log("[ADMIN_MAGIC_VERIFY] User found:", user.id);

    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    console.log("[ADMIN_MAGIC_VERIFY] Session created");

    const isHttps = req.headers["x-forwarded-proto"] === "https" || 
                    req.headers.host?.includes("bermudafranchisegroup.com") ||
                    req.headers.host?.includes("replit");
    
    const cookieName = isHttps
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const cookieOptions = [
      `${cookieName}=${sessionToken}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Expires=${expires.toUTCString()}`,
    ];

    if (isHttps) {
      cookieOptions.push("Secure");
    }

    console.log("[ADMIN_MAGIC_VERIFY] Setting cookie:", cookieName, "isHttps:", isHttps);

    res.setHeader("Set-Cookie", cookieOptions.join("; "));

    const redirectPath = redirect || "/datarooms";
    console.log("[ADMIN_MAGIC_VERIFY] Success for:", email, "redirecting to:", redirectPath);
    
    return res.redirect(redirectPath);
  } catch (error) {
    console.error("[ADMIN_MAGIC_VERIFY] Error:", error);
    return res.redirect("/login?error=VerificationFailed");
  }
}
