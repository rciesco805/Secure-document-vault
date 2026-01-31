"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

export default function VerifyPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(false);
  
  const id = searchParams?.get("id") ?? null;
  const checksum = searchParams?.get("checksum") ?? null;
  
  useEffect(() => {
    async function validateOnLoad() {
      if (!id || !checksum) {
        setIsValidating(false);
        return;
      }
      
      try {
        const response = await fetch("/api/auth/verify-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, checksum, action: "validate" }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setIsLinkValid(true);
          setError(null);
        } else {
          setError(data.error || "This link is invalid or has expired.");
          setIsLinkValid(false);
        }
      } catch {
        setError("Failed to validate link. Please try again.");
        setIsLinkValid(false);
      } finally {
        setIsValidating(false);
      }
    }
    
    validateOnLoad();
  }, [id, checksum]);
  
  const handleSignIn = async () => {
    if (!id || !checksum) {
      setError("Invalid verification link");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/auth/verify-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, checksum, action: "sign_in" }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.valid) {
        setError(data.error || "Invalid or expired verification link. Please request a new one.");
        setIsLoading(false);
        return;
      }
      
      window.location.href = data.callbackUrl;
    } catch {
      setError("Failed to complete sign in. Please try again.");
      setIsLoading(false);
    }
  };
  
  if (!id || !checksum) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This verification link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/login")} variant="outline">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
            <CardTitle>Verifying Link...</CardTitle>
            <CardDescription>
              Please wait while we verify your login link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <CardTitle>Complete Your Sign In</CardTitle>
          <CardDescription>
            Click the button below to securely sign in to your BF Fund Portal account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          
          <Button
            onClick={handleSignIn}
            disabled={isLoading || !isLinkValid}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In to Portal"
            )}
          </Button>
          
          {!isLinkValid && !error && (
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="w-full"
            >
              Request New Login Link
            </Button>
          )}
          
          <p className="text-center text-xs text-gray-500">
            This extra step ensures that only you can access your account,
            even if email security software scans your links.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
