import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import Persona from "persona";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShieldXIcon,
  ClockIcon,
  AlertCircleIcon,
  UserCheck,
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
  compact?: boolean;
}

export function KycVerification({ onStatusChange, compact = false }: KycVerificationProps) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);
  const embeddedClientRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Cleanup embedded client on unmount
  useEffect(() => {
    return () => {
      if (embeddedClientRef.current) {
        embeddedClientRef.current.destroy?.();
      }
    };
  }, []);

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

      if (data.inquiryId && data.environmentId) {
        // Show embedded dialog and initialize Persona
        setShowEmbedded(true);
        
        // Wait for dialog to render
        setTimeout(() => {
          if (containerRef.current) {
            embeddedClientRef.current = new Persona.Client({
              inquiryId: data.inquiryId,
              environmentId: data.environmentId,
              sessionToken: data.sessionToken,
              
              onReady: () => {
                console.log("[Persona] Ready");
                embeddedClientRef.current?.open();
              },
              
              onComplete: async ({ inquiryId, status }: { inquiryId: string; status: string }) => {
                console.log("[Persona] Complete:", status);
                toast.success("Identity verification submitted successfully!");
                setShowEmbedded(false);
                await fetchStatus();
              },
              
              onCancel: ({ inquiryId }: { inquiryId?: string; sessionToken?: string }) => {
                console.log("[Persona] Cancelled");
                setShowEmbedded(false);
              },
              
              onError: (error: any) => {
                console.error("[Persona] Error:", error);
                toast.error("Verification error. Please try again.");
                setShowEmbedded(false);
              },
            });
          }
        }, 100);
      }
    } catch (error) {
      toast.error("Failed to start identity verification");
      console.error(error);
    } finally {
      setStarting(false);
    }
  };

  const handleCloseEmbedded = () => {
    if (embeddedClientRef.current) {
      embeddedClientRef.current.destroy?.();
      embeddedClientRef.current = null;
    }
    setShowEmbedded(false);
  };

  if (loading) {
    return compact ? null : (
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
          icon: <ShieldCheckIcon className="h-5 w-5 text-green-500" />,
          badge: <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Verified</Badge>,
          title: "Identity Verified",
          description: kycStatus.verifiedAt 
            ? `Verified on ${new Date(kycStatus.verifiedAt).toLocaleDateString()}`
            : "Your identity has been verified",
          showButton: false,
        };
      case "PENDING":
        return {
          icon: <ClockIcon className="h-5 w-5 text-yellow-500" />,
          badge: <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Pending</Badge>,
          title: "Verification In Progress",
          description: "Your identity verification is being reviewed",
          showButton: true,
          buttonText: "Continue Verification",
        };
      case "NEEDS_REVIEW":
        return {
          icon: <AlertCircleIcon className="h-5 w-5 text-orange-500" />,
          badge: <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">Under Review</Badge>,
          title: "Additional Review Required",
          description: "Your verification requires additional review. We'll notify you when complete.",
          showButton: false,
        };
      case "DECLINED":
        return {
          icon: <ShieldXIcon className="h-5 w-5 text-red-500" />,
          badge: <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Declined</Badge>,
          title: "Verification Declined",
          description: "Your identity verification was not successful. Please contact support.",
          showButton: false,
        };
      case "EXPIRED":
        return {
          icon: <ShieldAlertIcon className="h-5 w-5 text-gray-500" />,
          badge: <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">Expired</Badge>,
          title: "Verification Expired",
          description: "Your verification has expired. Please verify again.",
          showButton: true,
          buttonText: "Verify Identity",
        };
      default:
        return {
          icon: <UserCheck className="h-5 w-5 text-blue-500" />,
          badge: <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Required</Badge>,
          title: "Identity Verification Required",
          description: "Complete identity verification to access all investment features",
          showButton: true,
          buttonText: "Verify Identity",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Compact sidebar button view
  if (compact) {
    if (!statusDisplay.showButton) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
          {statusDisplay.icon}
          <span>{kycStatus.status === "APPROVED" ? "Verified" : kycStatus.status}</span>
        </div>
      );
    }

    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartVerification}
          disabled={starting}
          className="w-full justify-start gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
        >
          <UserCheck className="h-4 w-4" />
          {starting ? "Starting..." : statusDisplay.buttonText}
        </Button>

        {/* Embedded Persona Dialog */}
        <Dialog open={showEmbedded} onOpenChange={handleCloseEmbedded}>
          <DialogContent className="max-w-2xl h-[80vh] p-0 bg-white">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-gray-900">Identity Verification</DialogTitle>
            </DialogHeader>
            <div ref={containerRef} className="flex-1 h-full min-h-[500px]" id="persona-container" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full card view
  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusDisplay.icon}
              <CardTitle className="text-base text-white">{statusDisplay.title}</CardTitle>
            </div>
            {statusDisplay.badge}
          </div>
          <CardDescription className="text-gray-400">{statusDisplay.description}</CardDescription>
        </CardHeader>
        {statusDisplay.showButton && (
          <CardContent>
            <Button
              onClick={handleStartVerification}
              disabled={starting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {starting ? "Starting verification..." : statusDisplay.buttonText}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Embedded Persona Dialog */}
      <Dialog open={showEmbedded} onOpenChange={handleCloseEmbedded}>
        <DialogContent className="max-w-2xl h-[80vh] p-0 bg-white">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-gray-900">Identity Verification</DialogTitle>
          </DialogHeader>
          <div ref={containerRef} className="flex-1 h-full min-h-[500px]" id="persona-container" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default KycVerification;
