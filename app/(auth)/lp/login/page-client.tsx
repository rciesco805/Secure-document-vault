"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { LPSignIn } from "@/components/auth/lp-signin";

export default function LPLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  
  const next = useMemo(() => {
    const nextParam = searchParams?.get("next");
    if (!nextParam) return null;
    const decoded = decodeURIComponent(nextParam);
    if (decoded.includes("/login") || decoded.includes("/lp/login")) {
      return null;
    }
    return decoded;
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = next || "/lp/dashboard";
      router.replace(callbackUrl);
    }
  }, [status, router, next]);

  // Handle authentication errors from URL params
  const authError = searchParams?.get("error");
  useEffect(() => {
    if (authError) {
      const errorMessages: Record<string, string> = {
        Verification: "Your login link has expired or was already used. Please request a new one.",
        AccessDenied: "Access denied. You may not have permission to access this portal.",
        Configuration: "There was a configuration error. Please try again.",
        Default: "An error occurred during sign in. Please try again.",
      };
      const message = errorMessages[authError] || errorMessages.Default;
      toast.error(message);
      // Clear the error from URL without refresh
      window.history.replaceState({}, '', '/lp/login');
    }
  }, [authError]);

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

  const callbackUrl = next || "/lp/dashboard";

  return (
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
  );
}
