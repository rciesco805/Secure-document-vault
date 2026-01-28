/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
  images: {
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: prepareRemotePatterns(),
  },
  skipTrailingSlashRedirect: true,
  assetPrefix:
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production"
      ? process.env.NEXT_PUBLIC_BASE_URL
      : undefined,
  async redirects() {
    return [
      ...(process.env.NEXT_PUBLIC_APP_BASE_HOST
        ? [
            {
              source: "/",
              destination: "/dashboard",
              permanent: false,
              has: [
                {
                  type: "host",
                  value: process.env.NEXT_PUBLIC_APP_BASE_HOST,
                },
              ],
            },
          ]
        : []),
      {
        // temporary redirect set on 2025-10-22
        source: "/view/cmdn06aw00001ju04jgsf8h4f",
        destination: "/view/cmh0uiv6t001mjm04sk10ecc8",
        permanent: false,
      },
      {
        source: "/settings",
        destination: "/settings/general",
        permanent: false,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    const trustedDomains = [
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://*.posthog.com",
      "https://eu.posthog.com",
      "https://api.rollbar.com",
      "https://*.rollbar.com",
      "https://unpkg.com",
      "https://*.replit.app",
      "https://objectstorage.replit.app",
      "https://*.bermudafranchisegroup.com",
      "https://api.stripe.com",
      "https://js.stripe.com",
      "https://*.plaid.com",
      "https://*.persona.com",
      "https://api.tinybird.co",
      "https://*.cal.com",
      "https://cal.com",
    ].join(" ");

    const scriptSrc = isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: ${trustedDomains} http:;`
      : `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${trustedDomains};`;

    const styleSrc = isDev
      ? `style-src 'self' 'unsafe-inline' ${trustedDomains} http:;`
      : `style-src 'self' 'unsafe-inline' ${trustedDomains};`;

    const connectSrc = isDev
      ? `connect-src 'self' ${trustedDomains} http: ws: wss:;`
      : `connect-src 'self' ${trustedDomains};`;

    const imgSrc = isDev
      ? `img-src 'self' data: blob: ${trustedDomains} http:;`
      : `img-src 'self' data: blob: ${trustedDomains} https:;`;

    const fontSrc = `font-src 'self' data: https://fonts.gstatic.com ${isDev ? "http:" : ""};`;

    const workerSrc = "worker-src 'self' blob: https://unpkg.com;";

    const baseCsp = [
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
      "report-uri /api/csp-report;",
    ].filter(Boolean).join(" ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `${baseCsp} frame-ancestors 'none';`,
          },
        ],
      },
      {
        source: "/view/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
          {
            key: "Content-Security-Policy",
            value: `${baseCsp} frame-ancestors 'self';`,
          },
        ],
      },
      {
        source: "/view/:path*/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `${baseCsp} frame-ancestors 'self' https:;`,
          },
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      ...(process.env.NEXT_PUBLIC_WEBHOOK_BASE_HOST
        ? [
            {
              source: "/services/:path*",
              has: [
                {
                  type: "host",
                  value: process.env.NEXT_PUBLIC_WEBHOOK_BASE_HOST,
                },
              ],
              headers: [
                {
                  key: "X-Robots-Tag",
                  value: "noindex",
                },
              ],
            },
          ]
        : []),
      {
        source: "/api/webhooks/services/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      {
        source: "/unsubscribe",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
      {
        // Service worker - never cache to ensure updates are immediate
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        // Manifest - short cache to pick up updates
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ["*.replit.dev", "*.spock.replit.dev", "*.repl.co"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/mupdf/*": ["./node_modules/mupdf/dist/*.wasm"],
    },
    missingSuspenseWithCSRBailout: false,
    serverComponentsExternalPackages: ["nodemailer"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

function prepareRemotePatterns() {
  let patterns = [
    // BF Fund assets
    { protocol: "https", hostname: "dataroom.bermudafranchisegroup.com" },
    { protocol: "https", hostname: "*.bermudafranchisegroup.com" },
    // CDN and storage
    { protocol: "https", hostname: "d2kgph70pw5d9n.cloudfront.net" },
    { protocol: "https", hostname: "d36r2enbzam0iu.cloudfront.net" },
    { protocol: "https", hostname: "d35vw2hoyyl88.cloudfront.net" },
    // twitter img
    { protocol: "https", hostname: "pbs.twimg.com" },
    // linkedin img
    { protocol: "https", hostname: "media.licdn.com" },
    // google img
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
    // useragent img
    { protocol: "https", hostname: "faisalman.github.io" },
    // Replit Object Storage
    { protocol: "https", hostname: "*.replit.app" },
    { protocol: "https", hostname: "objectstorage.replit.app" },
  ];

  // Default region patterns
  if (process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST,
    });
  }

  if (process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST,
    });
  }

  // US region patterns
  if (process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST_US) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST_US,
    });
  }

  if (process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST_US) {
    patterns.push({
      protocol: "https",
      hostname: process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST_US,
    });
  }

  if (process.env.VERCEL_ENV === "production") {
    patterns.push({
      // production vercel blob
      protocol: "https",
      hostname: "yoywvlh29jppecbh.public.blob.vercel-storage.com",
    });
  }

  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development"
  ) {
    patterns.push({
      // staging vercel blob
      protocol: "https",
      hostname: "36so9a8uzykxknsu.public.blob.vercel-storage.com",
    });
  }

  return patterns;
}

export default nextConfig;
