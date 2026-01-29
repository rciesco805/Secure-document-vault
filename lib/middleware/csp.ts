import { NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

const trustedScriptDomains = [
  "https://*.posthog.com",
  "https://eu.posthog.com",
  "https://api.rollbar.com",
  "https://*.rollbar.com",
  "https://unpkg.com",
  "https://js.stripe.com",
  "https://*.plaid.com",
  "https://*.persona.com",
].join(" ");

const dynamicConnectHosts = [
  process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST,
  process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST,
  process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST_US,
  process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST_US,
].filter(Boolean).map(host => `https://${host}`);

const trustedConnectDomains = [
  "https://*.posthog.com",
  "https://eu.posthog.com",
  "https://api.rollbar.com",
  "https://*.rollbar.com",
  "https://*.replit.app",
  "https://objectstorage.replit.app",
  "https://dataroom.bermudafranchisegroup.com",
  "https://*.bermudafranchisegroup.com",
  "https://api.stripe.com",
  "https://*.plaid.com",
  "https://*.persona.com",
  "https://api.tinybird.co",
  "https://*.cal.com",
  "https://cal.com",
  "https://*.public.blob.vercel-storage.com",
  "https://yoywvlh29jppecbh.public.blob.vercel-storage.com",
  "https://36so9a8uzykxknsu.public.blob.vercel-storage.com",
  "https://blob.vercel-storage.com",
  "https://*.vercel-storage.com",
  ...dynamicConnectHosts,
].join(" ");

const dynamicImageHosts = [
  process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST,
  process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST,
  process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST_US,
  process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST_US,
].filter(Boolean).map(host => `https://${host}`);

const trustedImageDomains = [
  "https://dataroom.bermudafranchisegroup.com",
  "https://*.bermudafranchisegroup.com",
  "https://pbs.twimg.com",
  "https://media.licdn.com",
  "https://lh3.googleusercontent.com",
  "https://faisalman.github.io",
  "https://*.replit.app",
  "https://objectstorage.replit.app",
  "https://*.public.blob.vercel-storage.com",
  "https://yoywvlh29jppecbh.public.blob.vercel-storage.com",
  "https://36so9a8uzykxknsu.public.blob.vercel-storage.com",
  "https://blob.vercel-storage.com",
  ...dynamicImageHosts,
].join(" ");

const trustedStyleDomains = "https://fonts.googleapis.com";
const trustedFontDomains = "https://fonts.gstatic.com";

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

export function getFrameAncestors(path: string): string {
  const embedAllowedOrigins = process.env.CSP_EMBED_ALLOWED_ORIGINS || "";
  const allowAllEmbeds = process.env.CSP_EMBED_ALLOW_ALL === "true";

  if (path.includes("/embed")) {
    return embedAllowedOrigins
      ? `'self' ${embedAllowedOrigins}`
      : allowAllEmbeds
        ? "'self' https:"
        : "'self'";
  }

  if (path.startsWith("/view/")) {
    return "'self'";
  }

  return "'none'";
}

export function buildCSP(nonce: string, path: string): string {
  const frameAncestors = getFrameAncestors(path);

  // Note: Using 'unsafe-inline' in production due to Next.js 16 Turbopack nonce propagation issues
  // TODO: Re-enable nonce-based CSP once Next.js fixes nonce handling in production builds
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: ${trustedScriptDomains} http:;`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' wasm-unsafe-eval blob: data: ${trustedScriptDomains};`;

  const styleSrc = isDev
    ? `style-src 'self' 'unsafe-inline' ${trustedStyleDomains} http:;`
    : `style-src 'self' 'unsafe-inline' ${trustedStyleDomains};`;

  const connectSrc = isDev
    ? `connect-src 'self' ${trustedConnectDomains} http: ws: wss:;`
    : `connect-src 'self' ${trustedConnectDomains};`;

  const imgSrc = isDev
    ? `img-src 'self' data: blob: ${trustedImageDomains} http:;`
    : `img-src 'self' data: blob: ${trustedImageDomains};`;

  const fontSrc = `font-src 'self' data: ${trustedFontDomains}${isDev ? " http:" : ""};`;

  const workerSrc = "worker-src 'self' blob: https://unpkg.com;";

  return [
    `default-src 'self';`,
    scriptSrc,
    styleSrc,
    imgSrc,
    fontSrc,
    workerSrc,
    connectSrc,
    `object-src 'none';`,
    `base-uri 'self';`,
    `form-action 'self';`,
    isDev ? "" : "upgrade-insecure-requests;",
    `frame-ancestors ${frameAncestors};`,
    "report-uri /api/csp-report;",
  ].filter(Boolean).join(" ");
}

export function applyCSPHeaders(
  response: NextResponse,
  nonce: string,
  path: string
): NextResponse {
  const csp = buildCSP(nonce, path);

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  if (!path.startsWith("/view/")) {
    response.headers.set("X-Frame-Options", "DENY");
  } else {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
  }

  return response;
}

export function createCSPResponse(req: NextRequest): NextResponse {
  const nonce = generateNonce();
  const path = req.nextUrl.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applyCSPHeaders(response, nonce, path);
}

export function wrapResponseWithCSP(
  req: NextRequest,
  existingResponse: NextResponse
): NextResponse {
  const nonce = generateNonce();
  const path = req.nextUrl.pathname;

  existingResponse.headers.set("x-nonce", nonce);

  return applyCSPHeaders(existingResponse, nonce, path);
}
