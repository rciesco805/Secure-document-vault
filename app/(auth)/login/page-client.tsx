"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useState, useEffect, useMemo, useRef } from "react";

import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { LastUsed, useLastUsed } from "@/components/hooks/useLastUsed";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export default function Login() {
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const nextParam = searchParams?.get("next");
    if (!nextParam) return null;
    
    const decodedPath = decodeURIComponent(nextParam);
    // Prevent redirect loops - if next points to a login page, ignore it
    if (decodedPath.includes("/login") || decodedPath.includes("/admin/login") || decodedPath.includes("/lp/login")) {
      return null;
    }
    // Block admin routes from investor login - they must use /admin/login
    const adminRoutes = ["/dashboard", "/settings", "/documents", "/datarooms"];
    if (adminRoutes.some(route => decodedPath.startsWith(route))) {
      return null; // Ignore admin routes, will redirect to viewer-redirect instead
    }
    return decodedPath;
  }, [searchParams]);
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status ?? "loading";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(next || "/viewer-redirect");
    }
  }, [status, router, next]);

  const [lastUsed, setLastUsed] = useLastUsed();
  const [clickedMethod, setClickedMethod] = useState<"email" | undefined>(
    undefined,
  );
  const [email, setEmail] = useState<string>("");
  const [emailButtonText, setEmailButtonText] = useState<string>(
    "Continue with Email",
  );
  const [showAccessNotice, setShowAccessNotice] = useState(false);
  const isSubmittingRef = useRef(false);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    company: "",
  });
  const [inviteLoading, setInviteLoading] = useState(false);

  const inviteFormSchema = z.object({
    email: z.string().trim().email("Please enter a valid email"),
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    company: z.string().trim().min(2, "Company must be at least 2 characters"),
  });

  const inviteValidation = inviteFormSchema.safeParse(inviteForm);
  const isInviteFormValid = inviteValidation.success;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteValidation.success) {
      toast.error(inviteValidation.error.errors[0]?.message || "Please fill in all fields correctly");
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch("/api/request-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      if (response.ok) {
        toast.success("Request sent! We'll be in touch soon.");
        setInviteDialogOpen(false);
        setInviteForm({ email: "", fullName: "", company: "" });
      } else {
        toast.error("Failed to send request. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Please enter a valid email." })
    .email({ message: "Please enter a valid email." });

  const emailValidation = emailSchema.safeParse(email);

  return (
    <div className="flex h-screen w-full flex-wrap bg-black">
      {/* Left part */}
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
                BF Fund Investor Portal
              </span>
            </Link>
            <span className="text-sm font-medium text-gray-400">
              For accredited investors only
            </span>
            <h3 className="text-sm text-gray-300">
              Secure access to Bermuda Franchise Fund Dataroom
            </h3>
          </div>
          <div className="px-4 pt-6 sm:px-12">
            <p className="mb-3 text-center">
              <span className="block text-lg font-bold text-white">First time here and want access?</span>
              <span className="block text-lg font-bold text-white">Click below</span>
            </p>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-gray-600 bg-gray-700 text-white hover:bg-gray-600 hover:text-white"
                >
                  Request Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Request Access</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Submit your details to request access to the BF Fund Investor Portal.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name" className="text-gray-300">Full Name</Label>
                    <Input
                      id="invite-name"
                      placeholder="John Smith"
                      value={inviteForm.fullName}
                      onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                      className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-gray-300">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="john@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-company" className="text-gray-300">Company</Label>
                    <Input
                      id="invite-company"
                      placeholder="Company Name"
                      value={inviteForm.company}
                      onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
                      className="border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={inviteLoading || !isInviteFormValid}
                    className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                  >
                    {inviteLoading ? "Sending..." : "Submit Request"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative my-6 px-4 sm:px-12">
            <div className="absolute inset-0 flex items-center px-4 sm:px-12">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-base font-medium text-gray-300">Already have access?</span>
            </div>
          </div>
          <div className="px-4 sm:px-12">
            <p className="mb-4 text-center text-gray-300">
              Enter your email below for an email with one-click access
            </p>
          </div>
          <form
            className="flex flex-col gap-4 px-4 sm:px-12"
            onSubmit={async (e) => {
              e.preventDefault();
              
              // Prevent double submission
              if (isSubmittingRef.current || clickedMethod === "email") {
                return;
              }
              
              if (!emailValidation.success) {
                toast.error(emailValidation.error.errors[0].message);
                return;
              }

              isSubmittingRef.current = true;
              setClickedMethod("email");

              // Check if user is authorized before sending magic link
              try {
                const checkRes = await fetch("/api/auth/check-visitor", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: emailValidation.data }),
                });
                const { isAuthorized, isAdmin } = await checkRes.json();
                
                if (!isAuthorized) {
                  setClickedMethod(undefined);
                  setShowAccessNotice(true);
                  isSubmittingRef.current = false;
                  return;
                }

                // If admin using visitor portal, they enter as visitor
                if (isAdmin) {
                  toast.info("You will access the platform as a visitor through this portal.");
                }
              } catch (error) {
                setClickedMethod(undefined);
                toast.error("Unable to verify access. Please try again.");
                isSubmittingRef.current = false;
                return;
              }

              // Pass mode=visitor so admins testing from this page get visitor experience
              const callbackUrl = next || "/viewer-redirect?mode=visitor";
              signIn("email", {
                email: emailValidation.data,
                redirect: false,
                callbackUrl,
              }).then((res) => {
                if (res?.ok && !res?.error) {
                  setEmail("");
                  setLastUsed("credentials");
                  setEmailButtonText("Email sent - check your inbox!");
                  toast.success("Email sent - check your inbox!");
                  setShowAccessNotice(false);
                } else {
                  setEmailButtonText("Continue with Email");
                  toast.error("Failed to send login email. Please try again.");
                  isSubmittingRef.current = false;
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
              placeholder="name@example.com"
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
            <div className="mx-4 mt-4 sm:mx-12 relative rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <button
                onClick={() => setShowAccessNotice(false)}
                className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white transition-colors"
                aria-label="Close notice"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-amber-200 pr-6">
                Your email is not on the approved access list. Please request an invite using the button above.
              </p>
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
              href="/admin/login"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Admin access
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
            {/* Brand showcase */}
            <div
              className="flex w-full flex-col items-center justify-center"
              style={{ height: "100%" }}
            >
              {/* Logo container */}
              <div className="mb-8">
                <img
                  className="h-32 w-auto"
                  src="/_static/bfg-logo-white.png"
                  alt="Bermuda Franchise Group"
                />
              </div>
              {/* Text content */}
              <div className="max-w-xl text-center px-8">
                <h2 className="text-balance text-2xl font-bold leading-8 text-white sm:text-3xl mb-4">
                  Bermuda Franchise Group
                </h2>
                <p className="text-balance font-normal leading-7 text-gray-300 sm:text-lg">
                  Scaling the Modern Work Lifestyle Club Experience Across America
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
