import { NextRequest, NextResponse } from "next/server";

import { getToken } from "next-auth/jwt";

export default async function AppMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const isInvited = url.searchParams.has("invitation");
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  })) as {
    email?: string;
    user?: {
      createdAt?: string;
    };
  };

  // UNAUTHENTICATED if there's no token and the path isn't a login page, redirect to /login
  const isLoginPage = path === "/login" || path === "/admin/login";
  if (!token?.email && !isLoginPage) {
    const loginUrl = new URL(`/login`, req.url);
    // Append "next" parameter only if not navigating to the root
    if (path !== "/") {
      // Always include query string for view pages and email-confirm
      const nextPath = `${path}${url.search}`;
      loginUrl.searchParams.set("next", encodeURIComponent(nextPath));
    }
    return NextResponse.redirect(loginUrl);
  }

  // AUTHENTICATED if the user was created in the last 10 seconds, redirect to "/welcome"
  if (
    token?.email &&
    token?.user?.createdAt &&
    new Date(token?.user?.createdAt).getTime() > Date.now() - 10000 &&
    path !== "/welcome" &&
    !isInvited
  ) {
    return NextResponse.redirect(new URL("/welcome", req.url));
  }

  // AUTHENTICATED if the path is a login page, redirect appropriately
  // The actual team check happens on the dashboard page via API
  if (token?.email && isLoginPage) {
    const nextParam = url.searchParams.get("next");
    // Admin login always goes to dashboard, investor login goes to viewer-redirect
    const defaultRedirect = path === "/admin/login" ? "/dashboard" : "/viewer-redirect";
    const nextPath = nextParam || defaultRedirect;
    return NextResponse.redirect(
      new URL(decodeURIComponent(nextPath), req.url),
    );
  }

  // Allow viewer-portal access for all authenticated users
  if (token?.email && path === "/viewer-portal") {
    return NextResponse.next();
  }
}
