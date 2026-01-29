import { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/styles/globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

const data = {
  description:
    "Secure investor dataroom for Bermuda Franchise Group. Access investment documents with verified email authentication.",
  title: "BF Fund Investor Portal",
  url: "/",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bermudafranchisegroup.com"),
  title: data.title,
  description: data.description,
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Sacramento&family=Allura&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
