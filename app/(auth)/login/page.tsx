import { Metadata } from "next";
import { Suspense } from "react";

import { GTMComponent } from "@/components/gtm-component";

import LoginClient from "./page-client";

const data = {
  description: "Login to BF Fund Investor Portal",
  title: "Login | BF Fund",
  url: "/login",
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

export default function LoginPage() {
  return (
    <>
      <GTMComponent />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
        <LoginClient />
      </Suspense>
    </>
  );
}
