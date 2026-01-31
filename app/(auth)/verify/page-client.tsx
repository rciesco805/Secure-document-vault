"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

export default function VerifyPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const verificationUrl = searchParams?.get("verification_url") ?? null;
  const checksum = searchParams?.get("checksum") ?? null;
  
  const handleSignIn = async () => {
    if (!verificationUrl) {
      setError("Invalid verification link");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/auth/verify-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification_url: verificationUrl, checksum }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.valid) {
        setError(data.error || "Invalid or expired verification link. Please request a new one.");
        setIsLoading(false);
        return;
      }
      
      window.location.href = verificationUrl;
    } catch (err) {
      setError("Failed to verify link. Please try again.");
      setIsLoading(false);
    }
  };
  
  if (!verificationUrl || !checksum) {
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
            disabled={isLoading}
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
          
          <p className="text-center text-xs text-gray-500">
            This extra step ensures that only you can access your account,
            even if email security software scans your links.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
