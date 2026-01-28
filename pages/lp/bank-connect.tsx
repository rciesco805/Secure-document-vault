import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2, Loader2, AlertCircle, ArrowLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface BankLinkInfo {
  id: string;
  institutionName: string | null;
  accountName: string | null;
  accountMask: string | null;
  accountType: string | null;
}

export default function BankConnectPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [existingLink, setExistingLink] = useState<BankLinkInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const checkBankStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/lp/bank/status");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/lp/onboard");
          return;
        }
        throw new Error("Failed to check bank status");
      }
      
      const data = await res.json();
      setConfigured(data.configured);
      
      if (data.hasBankLink) {
        setExistingLink(data.bankLink);
      }
      
      if (data.configured) {
        await fetchLinkToken();
      }
    } catch (err) {
      console.error("Error checking bank status:", err);
      setError("Failed to load bank connection status");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkBankStatus();
  }, [checkBankStatus]);

  const fetchLinkToken = async () => {
    try {
      const res = await fetch("/api/lp/bank/link-token", {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (!data.configured) {
          setConfigured(false);
          return;
        }
        throw new Error(data.message || "Failed to create link token");
      }
      
      const data = await res.json();
      setLinkToken(data.linkToken);
    } catch (err) {
      console.error("Error fetching link token:", err);
      setError("Failed to initialize bank connection");
    }
  };

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setConnecting(true);
    try {
      const accountId = metadata.accounts?.[0]?.id;
      
      if (!accountId) {
        throw new Error("No account selected");
      }

      const res = await fetch("/api/lp/bank/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          accountId,
          metadata: {
            institution: metadata.institution,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to connect bank account");
      }

      const data = await res.json();
      setExistingLink(data.bankLink);
      setConnected(true);
      toast.success("Bank account connected successfully!");
      
      // Trigger KYC verification after bank connect if not already verified
      if (data.requiresKyc) {
        setTimeout(() => {
          router.push("/lp/dashboard?triggerKyc=true");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Error connecting bank:", err);
      toast.error(err.message || "Failed to connect bank account");
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, [router]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      if (err) {
        console.error("Plaid Link exited with error:", err);
      }
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Head>
          <title>Bank Connect | BF Fund</title>
        </Head>
        <div className="max-w-lg mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle>Bank Connect Not Available</CardTitle>
              <CardDescription>
                Bank connection is not yet configured for this portal. Please contact your fund administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" onClick={() => router.push("/lp/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Head>
        <title>Bank Connect | BF Fund</title>
      </Head>
      
      <div className="max-w-lg mx-auto mt-10">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push("/lp/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {connected || existingLink ? (
          <Card>
            <CardHeader className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Bank Account Connected</CardTitle>
              <CardDescription>
                Your bank account is linked for capital calls and distributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {existingLink && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-10 w-10 text-gray-600" />
                    <div>
                      <p className="font-semibold">{existingLink.institutionName || "Bank Account"}</p>
                      <p className="text-sm text-gray-500">
                        {existingLink.accountName} ••••{existingLink.accountMask}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {existingLink.accountType} Account
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setConnected(false);
                    setExistingLink(null);
                    fetchLinkToken();
                  }}
                >
                  Connect Different Account
                </Button>
                <Button
                  className="w-full"
                  onClick={() => router.push("/lp/dashboard")}
                >
                  Continue to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CreditCard className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-2xl">Connect Your Bank</CardTitle>
              <CardDescription>
                Securely link your bank account for capital calls and distribution payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Why connect your bank?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Receive distribution payments directly</li>
                  <li>• Fund capital calls with one click</li>
                  <li>• Secure, encrypted connection</li>
                  <li>• Bank-level security with Plaid</li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-12 text-lg"
                onClick={() => open()}
                disabled={!ready || connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Building2 className="h-5 w-5 mr-2" />
                    Connect Bank Account
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By connecting your bank, you agree to our Terms of Service and Privacy Policy.
                Your credentials are never stored on our servers.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
