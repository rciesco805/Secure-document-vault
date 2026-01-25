import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import crypto from "crypto";

function verifyChecksum(verificationUrl: string, checksum: string): boolean {
  if (!verificationUrl || !checksum) return false;
  
  try {
    const secret = process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_SECRET || "bf-fund-verify";
    const expectedChecksum = crypto
      .createHmac("sha256", secret)
      .update(verificationUrl)
      .digest("hex");
    return expectedChecksum === checksum;
  } catch {
    return true;
  }
}

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "verifying" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!router.isReady) return;

    const { verification_url, checksum } = router.query;

    if (!verification_url || typeof verification_url !== "string") {
      setStatus("error");
      setErrorMessage("Invalid verification link. Please request a new sign-in email.");
      return;
    }

    setStatus("verifying");

    const timer = setTimeout(() => {
      try {
        const decodedUrl = decodeURIComponent(verification_url);
        
        if (!decodedUrl.includes("/api/auth/callback/email")) {
          setStatus("error");
          setErrorMessage("Invalid verification link format.");
          return;
        }

        window.location.href = decodedUrl;
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setErrorMessage("Failed to process verification link. Please try again.");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [router.isReady, router.query]);

  return (
    <>
      <Head>
        <title>Verifying Email | BF Fund</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/_static/bfg-logo-white.png"
              alt="BF Fund"
              width={160}
              height={40}
              className="mx-auto mb-6"
            />
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 border border-gray-700">
            {status === "loading" && (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Preparing Verification
                </h2>
                <p className="text-gray-400">Please wait...</p>
              </div>
            )}

            {status === "verifying" && (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Verifying Your Email
                </h2>
                <p className="text-gray-400">
                  Redirecting you to your investor portal...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-400 mb-6">{errorMessage}</p>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Secure investor portal powered by BF Fund
          </p>
        </div>
      </div>
    </>
  );
}
