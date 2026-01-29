import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

import AppMiddleware from "@/lib/middleware/app";
import { createCSPResponse, wrapResponseWithCSP } from "@/lib/middleware/csp";
import DomainMiddleware from "@/lib/middleware/domain";

import { BLOCKED_PATHNAMES } from "./lib/constants";
import IncomingWebhookMiddleware, {
  isWebhookPath,
} from "./lib/middleware/incoming-webhooks";
import PostHogMiddleware from "./lib/middleware/posthog";
import { serverInstance } from "./lib/rollbar";

function isAnalyticsPath(path: string): boolean {
  const pattern = /^\/ingest\/.*/;
  return pattern.test(path);
}

function validateHost(host: string | null): boolean {
  if (!host) return false;
  
  const hostPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-\.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  const cleanHost = host.split(':')[0];
  
  if (cleanHost.length > 253) return false;
  if (!hostPattern.test(cleanHost)) return false;
  
  return true;
}

function validateClientIP(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  
  const ip = forwardedFor?.split(',')[0]?.trim() || realIP || null;
  
  if (ip) {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Pattern = /^([a-fA-F0-9:]+)$/;
    
    if (!ipv4Pattern.test(ip) && !ipv6Pattern.test(ip)) {
      return null;
    }
  }
  
  return ip;
}

function escapePath(path: string): string {
  return path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizePath(path: string): string {
  let sanitized = path.replace(/\.{2,}/g, '');
  sanitized = sanitized.replace(/\/+/g, '/');
  sanitized = decodeURIComponent(sanitized).replace(/[<>'"]/g, '');
  return sanitized;
}

function isCustomDomain(host: string): boolean {
  return (
    (process.env.NODE_ENV === "development" &&
      host?.includes(".local")) ||
    (process.env.NODE_ENV !== "development" &&
      !(
        host?.includes("localhost") ||
        host?.includes("bermudafranchisegroup.com") ||
        host?.includes("bffund.com") ||
        host?.endsWith(".vercel.app") ||
        host?.endsWith(".replit.app") ||
        host?.endsWith(".replit.dev") ||
        host?.endsWith(".repl.co")
      ))
  );
}

function createErrorResponse(message: string, status: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_static|vendor|_icons|_vercel|favicon.ico|favicon.png|sitemap.xml|sw.js|sw-version.json|manifest.json|offline).*)",
  ],
};

export default async function proxy(req: NextRequest, ev: NextFetchEvent) {
  try {
    const path = sanitizePath(req.nextUrl.pathname);
    const host = req.headers.get("host");

    if (!validateHost(host)) {
      return createErrorResponse("Invalid host header", 400);
    }

    const clientIP = validateClientIP(req);
    if (clientIP) {
      req.headers.set("x-client-ip", clientIP);
    }

    if (isAnalyticsPath(path)) {
      const response = await PostHogMiddleware(req);
      return wrapResponseWithCSP(req, response);
    }

    if (isWebhookPath(host)) {
      const response = await IncomingWebhookMiddleware(req);
      return wrapResponseWithCSP(req, response);
    }

    if (isCustomDomain(host || "")) {
      const response = await DomainMiddleware(req);
      return wrapResponseWithCSP(req, response);
    }

    if (
      !path.startsWith("/view/") &&
      !path.startsWith("/verify") &&
      !path.startsWith("/unsubscribe")
    ) {
      const response = await AppMiddleware(req);
      if (response) {
        return wrapResponseWithCSP(req, response);
      }
      return createCSPResponse(req);
    }

    if (path.startsWith("/view/")) {
      const isBlocked = BLOCKED_PATHNAMES.some((blockedPath) => {
        const escapedBlockedPath = escapePath(blockedPath);
        const blockPattern = new RegExp(escapedBlockedPath);
        return blockPattern.test(path);
      });

      if (isBlocked || path.includes(".")) {
        const url = req.nextUrl.clone();
        const rewriteResponse = NextResponse.rewrite(url, { status: 404 });
        return wrapResponseWithCSP(req, rewriteResponse);
      }
    }

    return createCSPResponse(req);
  } catch (error) {
    serverInstance.error(error as Error, {
      path: req.nextUrl.pathname,
      method: req.method,
      host: req.headers.get("host"),
    });
    console.error("[Proxy Error]", error instanceof Error ? error.message : "Unknown error");
    
    return createErrorResponse("Internal server error", 500);
  }
}
