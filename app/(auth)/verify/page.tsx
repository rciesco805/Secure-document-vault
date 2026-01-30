import { Metadata } from "next";
import { redirect } from "next/navigation";

import NotFound from "@/pages/404";

import { generateChecksum } from "@/lib/utils/generate-checksum";

const data = {
  description: "Verify login to BF Fund Investor Portal",
  title: "Verify | BF Fund",
  url: "/verify",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bermudafranchisegroup.com"),
  title: data.title,
  description: data.description,
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "BF Fund Investor Portal",
    images: [
      {
        url: "/_static/bfg-logo-black.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: data.title,
    description: data.description,
    creator: "@bermudafranchise",
    images: ["/_static/bfg-logo-black.png"],
  },
};

function normalizeOrigin(urlString: string): string {
  try {
    const url = new URL(urlString);
    return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`.toLowerCase();
  } catch {
    return '';
  }
}

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const verificationBaseUrl = process.env.VERIFICATION_EMAIL_BASE_URL;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (nextAuthUrl) origins.push(normalizeOrigin(nextAuthUrl));
  if (verificationBaseUrl) origins.push(normalizeOrigin(verificationBaseUrl));
  if (publicBaseUrl) origins.push(normalizeOrigin(publicBaseUrl));
  
  origins.push('https://dataroom.bermudafranchisegroup.com');
  
  return [...new Set(origins.filter(o => o))];
}

function isValidNextAuthCallbackPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth/callback/');
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ verification_url?: string; checksum?: string }>;
}) {
  const { verification_url, checksum } = await searchParams;

  console.log("[VERIFY] Received params:", { 
    hasUrl: !!verification_url, 
    hasChecksum: !!checksum 
  });

  if (!verification_url || !checksum) {
    console.log("[VERIFY] Missing required params");
    return <NotFound />;
  }

  const isValidVerificationUrl = (url: string, providedChecksum: string): boolean => {
    try {
      const urlObj = new URL(url);
      const urlOrigin = normalizeOrigin(url);
      const allowedOrigins = getAllowedOrigins();
      
      console.log("[VERIFY] Origin check:", { 
        urlOrigin, 
        allowedOrigins,
        isAllowed: allowedOrigins.includes(urlOrigin)
      });
      
      if (!allowedOrigins.includes(urlOrigin)) {
        console.log("[VERIFY] Origin not in allowed list");
        return false;
      }
      
      if (!isValidNextAuthCallbackPath(urlObj.pathname)) {
        console.log("[VERIFY] Invalid callback path:", urlObj.pathname);
        return false;
      }
      
      const expectedChecksum = generateChecksum(url);
      const checksumMatch = providedChecksum === expectedChecksum;
      
      console.log("[VERIFY] Checksum match:", checksumMatch);
      
      return checksumMatch;
    } catch (error) {
      console.error("[VERIFY] Validation error:", error);
      return false;
    }
  };

  if (!isValidVerificationUrl(verification_url, checksum)) {
    console.log("[VERIFY] Validation failed for URL");
    return <NotFound />;
  }

  console.log("[VERIFY] Redirecting to callback URL");
  redirect(verification_url);
}
