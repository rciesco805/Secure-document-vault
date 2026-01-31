"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useState, useEffect, useMemo } from "react";

import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export default function AdminLoginClient() {
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const nextParam = searchParams?.get("next");
    if (!nextParam) return null;
    const decoded = decodeURIComponent(nextParam);
    // Prevent redirect loops - if next points to a login page, ignore it
    if (decoded.includes("/login") || decoded.includes("/admin/login") || decoded.includes("/lp/login")) {
      return null;
    }
    return decoded;
  }, [searchParams]);
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status ?? "loading";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(next || "/dashboard");
    }
  }, [status, router, next]);

  // Handle authentication errors from URL params
  const authError = searchParams?.get("error");
  useEffect(() => {
    if (authError) {
      const errorMessages: Record<string, string> = {
        Verification: "Your login link has expired or was already used. Please request a new one.",
        AccessDenied: "Access denied. You may not have admin permission.",
        Configuration: "There was a configuration error. Please try again.",
        Default: "An error occurred during sign in. Please try again.",
      };
      const message = errorMessages[authError] || errorMessages.Default;
      toast.error(message);
      // Clear the error from URL without refresh
      window.history.replaceState({}, '', '/admin/login');
    }
  }, [authError]);

  const [clickedMethod, setClickedMethod] = useState<"email" | undefined>(
    undefined,
  );
  const [email, setEmail] = useState<string>("");
  const [emailButtonText, setEmailButtonText] = useState<string>(
    "Continue with Email",
  );
  const [showAccessNotice, setShowAccessNotice] = useState(false);

  const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Please enter a valid email." })
    .email({ message: "Please enter a valid email." });

  const emailValidation = emailSchema.safeParse(email);

  return (
    <div className="flex h-screen w-full flex-wrap bg-black">
      <div className="flex w-full items-center justify-center bg-black md:w-1/2 lg:w-1/2">
        <div
          className="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        ></div>
        <div className="z-10 mx-5 h-fit w-full max-w-md overflow-hidden rounded-lg sm:mx-0">
          <div className="items-left flex flex-col space-y-3 px-4 py-6 pt-8 sm:px-12">
            <img
              src="/_static/bfg-logo-white.png"
              alt="Bermuda Franchise Group"
              className="mb-6 h-12 w-auto self-start"
            />
            <Link href="/">
              <span className="text-balance text-3xl font-semibold text-white">
                Admin Portal
              </span>
            </Link>
            <h3 className="text-sm text-gray-300">
              Authorized administrators only
            </h3>
          </div>
          <div className="mx-4 mt-2 mb-6 sm:mx-12 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200 text-center">
              This login is for BF Fund team administrators only. If you are an investor, please use the{" "}
              <Link href="/login" className="underline hover:text-amber-100">
                investor login
              </Link>.
            </p>
          </div>
          <div className="px-4 sm:px-12">
            <p className="mb-4 text-center text-gray-300">
              Enter your admin email to receive a secure login link
            </p>
          </div>
          <form
            className="flex flex-col gap-4 px-4 sm:px-12"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!emailValidation.success) {
                toast.error(emailValidation.error.errors[0].message);
                return;
              }

              setClickedMethod("email");
              
              try {
                const checkRes = await fetch("/api/auth/check-admin", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: emailValidation.data }),
                });
                const { isAdmin } = await checkRes.json();
                
                if (!isAdmin) {
                  setClickedMethod(undefined);
                  setShowAccessNotice(true);
                  return;
                }
              } catch (error) {
                setClickedMethod(undefined);
                toast.error("Unable to verify admin access. Please try again.");
                return;
              }

              signIn("email", {
                email: emailValidation.data,
                redirect: false,
                callbackUrl: next || "/dashboard",
              }).then((res) => {
                if (res?.ok && !res?.error) {
                  setEmail("");
                  setEmailButtonText("Email sent - check your inbox!");
                  toast.success("Email sent - check your inbox!");
                  setShowAccessNotice(false);
                } else {
                  setEmailButtonText("Continue with Email");
                  toast.error("Failed to send login email. Please try again.");
                }
                setClickedMethod(undefined);
              });
            }}
          >
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="admin@bermudafranchisegroup.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={clickedMethod === "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white ring-0 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50",
                email.length > 0 && !emailValidation.success
                  ? "border-red-500"
                  : "border-gray-600",
              )}
            />
            <div className="relative">
              <Button
                type="submit"
                loading={clickedMethod === "email"}
                disabled={!emailValidation.success || !!clickedMethod}
                className={cn(
                  "focus:shadow-outline w-full transform rounded px-4 py-2 text-black transition-colors duration-300 ease-in-out focus:outline-none",
                  clickedMethod === "email"
                    ? "bg-white"
                    : "bg-white hover:bg-gray-200",
                )}
              >
                {emailButtonText}
              </Button>
            </div>
          </form>
          {showAccessNotice && (
            <div className="mx-4 mt-4 sm:mx-12 relative rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <button
                onClick={() => setShowAccessNotice(false)}
                className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white transition-colors"
                aria-label="Close notice"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-red-200 pr-6 mb-3">
                This email is not authorized for admin access. This portal is only for BF Fund team administrators.
              </p>
              <p className="text-sm text-red-200 pr-6 mb-3">
                If you are an investor looking to access the dataroom, please use the investor portal instead.
              </p>
              <Link 
                href="/login" 
                className="inline-block w-full text-center py-2 px-4 bg-white text-black rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Go to Investor Login
              </Link>
            </div>
          )}
          <p className="mt-6 w-full max-w-md px-4 text-xs text-gray-400 sm:px-12">
            By clicking continue, you acknowledge that you have read and agree
            to Bermuda Franchise Group&apos;s terms of use. For inquiries,
            contact{" "}
            <a
              href="mailto:investors@bermudafranchisegroup.com"
              className="underline text-gray-300 hover:text-white"
            >
              investors@bermudafranchisegroup.com
            </a>
            .
          </p>
          <div className="mt-8 mb-4 w-full max-w-md px-4 text-center sm:px-12">
            <Link
              href="/login"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Back to investor login
            </Link>
          </div>
        </div>
      </div>
      <div className="relative hidden w-full justify-center overflow-hidden bg-black md:flex md:w-1/2 lg:w-1/2">
        <div className="relative m-0 flex h-full min-h-[700px] w-full p-0">
          <div
            className="relative flex h-full w-full flex-col justify-between"
            id="features"
          >
            <div
              className="flex w-full flex-col items-center justify-center"
              style={{ height: "100%" }}
            >
              <div className="mb-8">
                <img
                  className="h-32 w-auto"
                  src="/_static/bfg-logo-white.png"
                  alt="Bermuda Franchise Group"
                />
              </div>
              <div className="max-w-xl text-center px-8">
                <h2 className="text-balance text-2xl font-bold leading-8 text-white sm:text-3xl mb-4">
                  Bermuda Franchise Group
                </h2>
                <p className="text-balance font-normal leading-7 text-gray-300 sm:text-lg">
                  Admin Dashboard Access
                </p>
                <p className="mt-6 text-balance font-semibold text-white text-xl">
                  Work Well. Play Well. Be Well.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
