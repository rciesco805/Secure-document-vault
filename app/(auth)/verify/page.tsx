import { Metadata } from "next";
import Link from "next/link";

import NotFound from "@/pages/404";

import { generateChecksum } from "@/lib/utils/generate-checksum";

import { Button } from "@/components/ui/button";

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

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { verification_url?: string; checksum?: string };
}) {
  const { verification_url, checksum } = searchParams;

  if (!verification_url || !checksum) {
    return <NotFound />;
  }

  // Server-side validation
  const isValidVerificationUrl = (url: string, checksum: string): boolean => {
    try {
      const urlObj = new URL(url);
      if (urlObj.origin !== process.env.NEXTAUTH_URL) return false;
      const expectedChecksum = generateChecksum(url);
      return checksum === expectedChecksum;
    } catch {
      return false;
    }
  };

  if (!isValidVerificationUrl(verification_url, checksum)) {
    return <NotFound />;
  }

  return (
    <div className="flex h-screen w-full flex-wrap">
      {/* Left part */}
      <div className="flex w-full justify-center bg-black md:w-1/2 lg:w-1/2">
        <div
          className="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        ></div>
        <div className="z-10 mx-5 mt-[calc(1vh)] h-fit w-full max-w-md overflow-hidden rounded-lg sm:mx-0 sm:mt-[calc(2vh)] md:mt-[calc(3vh)]">
          <div className="items-left flex flex-col space-y-3 px-4 py-6 pt-8 sm:px-12">
            <img
              src="/_static/bfg-logo-white.png"
              alt="Bermuda Franchise Group"
              className="-mt-8 mb-36 h-10 w-auto self-start sm:mb-32 md:mb-48"
            />
            <Link href="/">
              <span className="text-balance text-3xl font-semibold text-white">
                Verify your login
              </span>
            </Link>
            <h3 className="text-balance text-sm text-gray-300">
              Secure access to investment documents.
            </h3>
          </div>
          <div className="flex flex-col gap-4 px-4 pt-8 sm:px-12">
            <div className="relative">
              <Link href={verification_url}>
                <Button className="focus:shadow-outline w-full transform rounded bg-white px-4 py-2 text-black transition-colors duration-300 ease-in-out hover:bg-gray-200 focus:outline-none">
                  Verify email
                </Button>
              </Link>
            </div>
          </div>
          <p className="mt-10 w-full max-w-md px-4 text-xs text-gray-400 sm:px-12">
            By clicking continue, you acknowledge that you have read and agree
            to Bermuda Franchise Group&apos;s terms of use. For inquiries, contact{" "}
            <a
              href="mailto:investors@bermudafranchisegroup.com"
              className="underline text-gray-300"
            >
              investors@bermudafranchisegroup.com
            </a>
            .
          </p>
        </div>
      </div>
      {/* Right part */}
      <div className="relative hidden w-full justify-center overflow-hidden bg-black md:flex md:w-1/2 lg:w-1/2">
        <div className="relative m-0 flex h-full min-h-[700px] w-full items-center justify-center p-0">
          <div className="flex flex-col items-center justify-center text-center">
            <img
              src="/_static/bfg-logo-white.png"
              alt="Bermuda Franchise Group"
              className="mb-8 h-32 w-auto"
            />
            <h2 className="mb-4 text-2xl font-semibold text-white">
              Bermuda Franchise Group
            </h2>
            <p className="mb-6 max-w-md text-lg text-gray-300">
              Scaling the Modern Work Lifestyle Club Experience Across America
            </p>
            <p className="text-xl font-semibold text-white">
              Work Well. Play Well. Be Well.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
