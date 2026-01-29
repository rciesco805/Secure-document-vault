"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileTextIcon,
  DownloadIcon,
  ShieldCheckIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  UsersIcon,
  ArrowLeftIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CertificateInfo {
  documentId: string;
  documentTitle: string;
  organizationName: string;
  completedAt: string;
  certificateId: string;
  recipientCount: number;
  verified: boolean;
}

export default function CertificateDownloadClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const documentId = params?.documentId as string;
  const token = searchParams?.get("token");

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const fetchCertificateInfo = async () => {
      try {
        const url = token
          ? `/api/sign/certificate/${documentId}/info?token=${token}`
          : `/api/sign/certificate/${documentId}/info`;

        const response = await fetch(url);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to fetch certificate info");
        }

        const data = await response.json();
        setCertificateInfo(data);
      } catch (err: any) {
        setError(err.message || "Failed to load certificate information");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateInfo();
  }, [documentId, token]);

  const handleDownload = async () => {
    if (!documentId) return;

    setDownloading(true);
    try {
      const url = token
        ? `/api/sign/certificate/${documentId}?token=${token}`
        : `/api/sign/certificate/${documentId}`;

      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to download certificate");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${certificateInfo?.documentTitle || "document"}_completion_certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to download certificate");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 text-destructive" />
              <CardTitle>Certificate Unavailable</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <ShieldCheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Completion Certificate</CardTitle>
          <CardDescription>
            Download the official completion certificate for this signed document
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Document</p>
                <p className="text-sm text-muted-foreground">
                  {certificateInfo?.documentTitle}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <UsersIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Organization</p>
                <p className="text-sm text-muted-foreground">
                  {certificateInfo?.organizationName}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Completed</p>
                <p className="text-sm text-muted-foreground">
                  {certificateInfo?.completedAt &&
                    new Date(certificateInfo.completedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Verified</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {certificateInfo?.certificateId}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This certificate contains the complete audit trail, signer information,
              and cryptographic verification hashes for the signed document.
            </p>
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Generating Certificate...
              </>
            ) : (
              <>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download Certificate
              </>
            )}
          </Button>

          <div className="text-center">
            <Link
              href={`/sign/certificate/verify?id=${certificateInfo?.certificateId}`}
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              Verify this certificate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
