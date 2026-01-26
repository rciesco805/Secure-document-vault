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

function normalizeHostname(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function getAllowedHostnames(): string[] {
  const hostnames: string[] = [];
  
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const verificationBaseUrl = process.env.VERIFICATION_EMAIL_BASE_URL;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (nextAuthUrl) hostnames.push(normalizeHostname(nextAuthUrl));
  if (verificationBaseUrl) hostnames.push(normalizeHostname(verificationBaseUrl));
  if (publicBaseUrl) hostnames.push(normalizeHostname(publicBaseUrl));
  
  hostnames.push('dataroom.bermudafranchisegroup.com');
  
  return [...new Set(hostnames.filter(h => h))];
}

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { verification_url?: string; checksum?: string };
}) {
  const { verification_url, checksum } = searchParams;

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
      const urlHostname = normalizeHostname(url);
      const allowedHostnames = getAllowedHostnames();
      
      console.log("[VERIFY] Hostname check:", { 
        urlHostname, 
        allowedHostnames,
        isAllowed: allowedHostnames.includes(urlHostname)
      });
      
      if (!allowedHostnames.includes(urlHostname)) {
        console.log("[VERIFY] Hostname not in allowed list");
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
