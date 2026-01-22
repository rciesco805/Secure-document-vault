import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShieldXIcon,
  ClockIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
} from "lucide-react";

interface KycStatus {
  configured: boolean;
  status: string;
  inquiryId?: string;
  verifiedAt?: string;
  environmentId?: string;
  templateId?: string;
  message?: string;
}

interface KycVerificationProps {
  onStatusChange?: (status: string) => void;
}

export function KycVerification({ onStatusChange }: KycVerificationProps) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/lp/kyc");
      if (response.ok) {
        const data = await response.json();
        setKycStatus(data);
        if (onStatusChange) {
          onStatusChange(data.status);
        }
      }
    } catch (error) {
      console.error("Failed to fetch KYC status:", error);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartVerification = async () => {
    setStarting(true);
    try {
      const response = await fetch("/api/lp/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!response.ok) {
        throw new Error("Failed to start verification");
      }

      const data = await response.json();

      // Open Persona in a new window/popup for embedded flow
      if (data.sessionToken && data.environmentId) {
        const personaUrl = `https://withpersona.com/verify?inquiry-id=${data.inquiryId}&environment-id=${data.environmentId}&session-token=${data.sessionToken}`;
        
        // Try to open in new window
        const popup = window.open(personaUrl, "persona-verification", "width=500,height=700,scrollbars=yes");
        
        if (popup) {
          // Poll for status updates
          const pollInterval = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollInterval);
              await fetchStatus();
            }
          }, 1000);
        } else {
          // Popup blocked - show direct link as fallback
          setVerificationUrl(personaUrl);
          toast.info("Click the verification link below to complete identity verification");
        }
      }
    } catch (error) {
      toast.error("Failed to start identity verification");
      console.error(error);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!kycStatus?.configured) {
    return null;
  }

  const getStatusDisplay = () => {
    switch (kycStatus.status) {
      case "APPROVED":
        return {
          icon: <ShieldCheckIcon className="h-5 w-5 text-green-600" />,
          badge: <Badge className="bg-green-100 text-green-800">Verified</Badge>,
          title: "Identity Verified",
          description: kycStatus.verifiedAt 
            ? `Verified on ${new Date(kycStatus.verifiedAt).toLocaleDateString()}`
            : "Your identity has been verified",
          showButton: false,
        };
      case "PENDING":
        return {
          icon: <ClockIcon className="h-5 w-5 text-yellow-600" />,
          badge: <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>,
          title: "Verification In Progress",
          description: "Your identity verification is being reviewed",
          showButton: true,
          buttonText: "Continue Verification",
        };
      case "NEEDS_REVIEW":
        return {
          icon: <AlertCircleIcon className="h-5 w-5 text-orange-600" />,
          badge: <Badge className="bg-orange-100 text-orange-800">Under Review</Badge>,
          title: "Additional Review Required",
          description: "Your verification requires additional review. We'll notify you when complete.",
          showButton: false,
        };
      case "DECLINED":
        return {
          icon: <ShieldXIcon className="h-5 w-5 text-red-600" />,
          badge: <Badge className="bg-red-100 text-red-800">Declined</Badge>,
          title: "Verification Declined",
          description: "Your identity verification was not successful. Please contact support.",
          showButton: false,
        };
      case "EXPIRED":
        return {
          icon: <ShieldAlertIcon className="h-5 w-5 text-gray-600" />,
          badge: <Badge className="bg-gray-100 text-gray-800">Expired</Badge>,
          title: "Verification Expired",
          description: "Your verification has expired. Please verify again.",
          showButton: true,
          buttonText: "Verify Identity",
        };
      default:
        return {
          icon: <ShieldAlertIcon className="h-5 w-5 text-blue-600" />,
          badge: <Badge className="bg-blue-100 text-blue-800">Required</Badge>,
          title: "Identity Verification Required",
          description: "Complete identity verification to access all investment features",
          showButton: true,
          buttonText: "Verify Identity",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusDisplay.icon}
            <CardTitle className="text-base">{statusDisplay.title}</CardTitle>
          </div>
          {statusDisplay.badge}
        </div>
        <CardDescription>{statusDisplay.description}</CardDescription>
      </CardHeader>
      {statusDisplay.showButton && (
        <CardContent className="space-y-3">
          <Button
            onClick={handleStartVerification}
            disabled={starting}
            className="w-full"
          >
            {starting ? (
              "Starting verification..."
            ) : (
              <>
                {statusDisplay.buttonText}
                <ExternalLinkIcon className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          {verificationUrl && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Popup blocked? Click below to verify:
              </p>
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center justify-center gap-1"
              >
                Open Verification
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default KycVerification;
