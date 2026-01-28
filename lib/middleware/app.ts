import { NextRequest, NextResponse } from "next/server";

import { getToken } from "next-auth/jwt";

export default async function AppMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  
  // Fast path for root - immediately redirect to login without token check
  // This ensures health checks and root access respond quickly
  if (path === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  
  const isInvited = url.searchParams.has("invitation");
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
  })) as {
    email?: string;
    role?: string;
    user?: {
      createdAt?: string;
      role?: string;
    };
  };

  // LP public pages (onboard and login are accessible without auth)
  if (path === "/lp/onboard" || path === "/lp/login") {
    return NextResponse.next();
  }

  // View pages are public - they have their own access control via visitor tokens
  // This allows magic link verification to happen on the page before any redirect
  if (path.startsWith("/view/")) {
    return NextResponse.next();
  }

  // LP authenticated routes (require login and LP/GP role)
  // Match any /lp/* path that isn't public
  if (path.startsWith("/lp/")) {
    if (!token?.email) {
      // Not authenticated - redirect to LP login
      const loginUrl = new URL("/lp/login", req.url);
      const nextPath = url.search ? `${path}${url.search}` : path;
      loginUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(loginUrl);
    }
    // Check if user has LP role (default for new users) or GP role (admins can access LP pages)
    const userRole = token.role || token.user?.role || "LP";
    if (userRole !== "LP" && userRole !== "GP") {
      // Invalid role - redirect to appropriate location
      return NextResponse.redirect(new URL("/viewer-redirect", req.url));
    }
    return NextResponse.next();
  }
  
  // GP/Admin routes - require GP role or team membership
  // Note: /admin/login is excluded - it's a public login page
  const gpRoutes = ["/dashboard", "/settings", "/documents", "/datarooms", "/admin"];
  const isAdminLoginPage = path === "/admin/login";
  if (!isAdminLoginPage && gpRoutes.some((r) => path.startsWith(r))) {
    if (!token?.email) {
      const loginUrl = new URL("/admin/login", req.url);
      const nextPath = url.search ? `${path}${url.search}` : path;
      loginUrl.searchParams.set("next", nextPath);
      return NextResponse.redirect(loginUrl);
    }
    // Check user role - LP users should be redirected to LP portal
    const userRole = token.role || token.user?.role || "LP";
    if (userRole === "LP") {
      // LP users trying to access GP routes - redirect to LP dashboard or viewer portal
      return NextResponse.redirect(new URL("/viewer-portal", req.url));
    }
    // GP role users can proceed - additional team membership check happens at page/API level
    return NextResponse.next();
  }

  // UNAUTHENTICATED if there's no token and the path isn't a login page, redirect appropriately
  const isLoginPage = path === "/login" || path === "/admin/login" || path === "/lp/login";
  const isAdminRoute = path.startsWith("/dashboard") || path.startsWith("/settings") || path.startsWith("/documents") || path.startsWith("/datarooms");
  
  if (!token?.email && !isLoginPage) {
    // Determine login path based on route type
    let loginPath = "/login";
    if (isAdminRoute) {
      loginPath = "/admin/login";
    }
    // LP routes are already handled above, but this catches any edge cases
    
    const loginUrl = new URL(loginPath, req.url);
    // Append "next" parameter only if not navigating to the root
    if (path !== "/") {
      // Include query string for view pages and other paths
      const nextPath = url.search ? `${path}${url.search}` : path;
      loginUrl.searchParams.set("next", nextPath);
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
    // Decode the next parameter and check it's not a login page (prevents redirect loops)
    let nextPath = nextParam ? decodeURIComponent(nextParam) : null;
    
    // Prevent redirect loops - if next points to a login page, use default instead
    if (nextPath && (nextPath.includes("/login") || nextPath.includes("/admin/login") || nextPath.includes("/lp/login"))) {
      nextPath = null;
    }
    
    // Admin login always goes to dashboard, investor login goes to viewer-redirect
    const defaultRedirect = path === "/admin/login" ? "/dashboard" : "/viewer-redirect";
    const finalPath = nextPath || defaultRedirect;
    return NextResponse.redirect(
      new URL(finalPath, req.url),
    );
  }

  // Allow viewer-portal access for all authenticated users
  if (token?.email && path === "/viewer-portal") {
    return NextResponse.next();
  }
}
