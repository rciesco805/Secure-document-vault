"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheckIcon,
  ShieldXIcon,
  Loader2Icon,
  SearchIcon,
  ArrowLeftIcon,
  FileTextIcon,
  ClockIcon,
  UsersIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface VerificationResult {
  verified: boolean;
  message?: string;
  document?: {
    id: string;
    title: string;
    organizationName: string;
    completedAt: string;
    recipientCount: number;
  };
  certificate?: {
    certificateId: string;
    generatedAt: string;
  };
}

export default function CertificateVerifyClient() {
  const searchParams = useSearchParams();
  const initialId = searchParams?.get("id") || "";

  const [certificateId, setCertificateId] = useState(initialId);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!certificateId.trim()) return;

    setVerifying(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/sign/certificate/verify?id=${encodeURIComponent(certificateId.trim())}`
      );
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({
        verified: false,
        message: "Failed to verify certificate. Please try again.",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <SearchIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Verify Certificate</CardTitle>
          <CardDescription>
            Enter a certificate ID to verify its authenticity
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter certificate ID (e.g., A1B2C3D4E5F6G7H8)"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            <Button onClick={handleVerify} disabled={verifying || !certificateId.trim()}>
              {verifying ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
            </Button>
          </div>

          {result && (
            <div className="space-y-4">
              <Separator />

              {result.verified ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <ShieldCheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-200">
                        Certificate Verified
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        This certificate is authentic and valid
                      </p>
                    </div>
                  </div>

                  {result.document && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Document</p>
                          <p className="text-sm text-muted-foreground">
                            {result.document.title}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-start gap-3">
                        <UsersIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Organization</p>
                          <p className="text-sm text-muted-foreground">
                            {result.document.organizationName}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-start gap-3">
                        <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Completed</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.document.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {result.document.recipientCount} signer(s)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {result.certificate?.certificateId}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                  <ShieldXIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-200">
                      Verification Failed
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {result.message || "Certificate not found or invalid"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
