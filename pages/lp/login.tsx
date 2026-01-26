import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";

import { LPSignIn } from "@/components/auth/lp-signin";

export default function LPLogin() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { next } = router.query;

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = typeof next === "string" ? next : "/lp/dashboard";
      router.replace(callbackUrl);
    }
  }, [status, router, next]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  const callbackUrl = typeof next === "string" ? next : "/lp/dashboard";

  return (
    <>
      <Head>
        <title>Investor Login | BF Fund</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <img
                src="/_static/bfg-logo-white.png"
                alt="Bermuda Franchise Group"
                className="h-12 w-auto mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-white">BF Fund</h1>
            </Link>
            <p className="text-gray-400 mt-2">Investor Portal</p>
          </div>

          <LPSignIn callbackUrl={callbackUrl} showOnboardLink={true} />

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Return to main login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
