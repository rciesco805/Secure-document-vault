import { Metadata } from "next";
import { Suspense } from "react";
import VerifyPageClient from "./page-client";

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

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <VerifyPageClient />
    </Suspense>
  );
}
