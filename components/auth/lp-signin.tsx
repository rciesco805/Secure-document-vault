"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LPSignInProps {
  callbackUrl?: string;
  showOnboardLink?: boolean;
}

export function LPSignIn({ callbackUrl = "/lp/dashboard", showOnboardLink = true }: LPSignInProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const isSubmittingRef = useRef(false);

  const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Please enter a valid email address" });

  const emailValidation = emailSchema.safeParse(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    
    if (!emailValidation.success) {
      toast.error(emailValidation.error.errors[0].message);
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const result = await signIn("email", {
        email: emailValidation.data,
        redirect: false,
        callbackUrl,
      });

      if (result?.ok && !result?.error) {
        setEmailSent(true);
        toast.success("Check your email for the login link!");
      } else {
        toast.error("Unable to send login email. Please try again.");
        isSubmittingRef.current = false;
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      isSubmittingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20">
            <Mail className="h-8 w-8 text-emerald-500" />
          </div>
          <CardTitle className="text-white">Check Your Email</CardTitle>
          <CardDescription className="text-gray-400">
            We sent a magic link to <span className="font-medium text-white">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-400 text-sm mb-6">
            Click the link in your email to access your investor dashboard.
          </p>
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => {
              setEmailSent(false);
              setEmail("");
              isSubmittingRef.current = false;
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white">Investor Sign In</CardTitle>
        <CardDescription className="text-gray-400">
          Enter your email to receive a secure login link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="lp-email" className="text-gray-300">
              Email Address
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="lp-email"
                type="email"
                placeholder="investor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading || !emailValidation.success}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {showOnboardLink && (
          <p className="text-center text-gray-500 text-sm mt-6">
            New investor?{" "}
            <Link href="/lp/onboard" className="text-emerald-500 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
