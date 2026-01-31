"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  FileText,
  TrendingUp,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  PenTool,
  ExternalLink,
  Building2,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { KycVerification } from "@/components/lp/kyc-verification";
import { ActivityTimeline } from "@/components/lp/activity-timeline";
import { SignaturePad } from "@/components/lp/signature-pad";
import { FundCard } from "@/components/lp/fund-card";
import { DocumentsVault } from "@/components/lp/documents-vault";
import { NotesCard } from "@/components/lp/notes-card";
import { DashboardSummary } from "@/components/lp/dashboard-summary";
import { DashboardSkeleton, FundCardSkeleton } from "@/components/lp/dashboard-skeleton";
import { WelcomeBanner } from "@/components/lp/welcome-banner";
import { EmptyState } from "@/components/lp/empty-state";
import { SubscriptionModal } from "@/components/lp/subscription-modal";
import { SubscriptionBanner } from "@/components/lp/subscription-banner";

interface InvestorDocument {
  id: string;
  title: string;
  documentType: string;
  signedAt: string | null;
  createdAt: string;
}

interface PendingSignature {
  id: string;
  documentId: string;
  documentTitle: string;
  teamName: string;
  signingToken: string;
  status: string;
  sentAt: string | null;
}

interface InvestorData {
  id: string;
  entityName: string | null;
  ndaSigned: boolean;
  accreditationStatus: string;
  fundData: any;
  signedDocs: any[];
  documents: InvestorDocument[];
  kycStatus?: string;
  kycVerifiedAt?: string | null;
  totalCommitment?: number;
  totalFunded?: number;
}

interface CapitalCall {
  id: string;
  callNumber: number;
  amount: string;
  dueDate: string;
  status: string;
  fundName: string;
}

interface FundAggregate {
  id: string;
  name: string;
  targetRaise: string;
  currentRaise: string;
  status: string;
  investorCount: number;
}

interface SignedDocument {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface FundDetailsData {
  summary: {
    totalCommitment: number;
    totalFunded: number;
    totalDistributions: number;
    activeFunds: number;
    pendingCapitalCallsCount: number;
    pendingCapitalCallsTotal: number;
  };
  funds: any[];
  pendingCapitalCalls: any[];
  recentTransactions: any[];
  documents: any[];
  notes: any[];
  lastUpdated: string;
}

export default function LPDashboardClient() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const sessionStatus = sessionData?.status ?? "loading";
  const [investor, setInvestor] = useState<InvestorData | null>(null);
  const [capitalCalls, setCapitalCalls] = useState<CapitalCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaSignature, setNdaSignature] = useState<string | null>(null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [accreditationData, setAccreditationData] = useState({
    confirmIncome: false,
    confirmNetWorth: false,
    confirmAccredited: false,
    confirmRiskAware: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignature[]>([]);
  const [bankStatus, setBankStatus] = useState<{
    hasBankLink: boolean;
    configured: boolean;
    bankLink: {
      institutionName: string | null;
      accountName: string | null;
      accountMask: string | null;
      accountType: string | null;
    } | null;
  } | null>(null);
  const [gateProgress, setGateProgress] = useState({
    ndaCompleted: false,
    accreditationCompleted: false,
    completionPercentage: 0,
  });
  const [fundAggregates, setFundAggregates] = useState<FundAggregate[]>([]);
  const [signedDocs, setSignedDocs] = useState<SignedDocument[]>([]);
  const [noteSent, setNoteSent] = useState(false);
  const [fundDetails, setFundDetails] = useState<FundDetailsData | null>(null);
  const [fundDetailsError, setFundDetailsError] = useState<string | null>(null);
  const [fundDetailsLoaded, setFundDetailsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const POLL_INTERVAL = 30000; // 30 seconds for real-time updates

  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasSubscription: boolean;
    canSubscribe: boolean;
    fund: any;
    pendingSubscription: any;
    signedSubscription: any;
    processingSubscription: any;
    hasBankAccount: boolean;
    entityName: string | null;
  } | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchFundDetails = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/lp/fund-details");
      if (res.ok) {
        const data = await res.json();
        setFundDetails(data);
        setFundDetailsError(null);
      } else if (res.status === 404) {
        setFundDetails(null);
        setFundDetailsError(null);
      } else {
        setFundDetailsError("Unable to load fund details. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching fund details:", error);
      if (!silent) {
        setFundDetailsError("Connection error. Please check your internet.");
      }
    } finally {
      setFundDetailsLoaded(true);
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/lp/subscription-status");
      if (res.ok) {
        const data = await res.json();
        setSubscriptionStatus(data);
        if (data.canSubscribe && !data.hasSubscription && investor?.ndaSigned) {
          setShowSubscriptionModal(true);
        }
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  }, [investor?.ndaSigned]);

  const handleSubscribe = async (data: { units?: number; amount: number; tierId?: string }) => {
    if (!subscriptionStatus?.fund) return;

    const res = await fetch("/api/lp/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fundId: subscriptionStatus.fund.id,
        units: data.units,
        amount: data.amount,
        tierId: data.tierId,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Subscription failed");
    }

    const result = await res.json();
    setShowSubscriptionModal(false);
    if (result.signingUrl) {
      window.location.href = result.signingUrl;
    } else {
      fetchSubscriptionStatus();
      fetchFundDetails();
    }
  };

  const handleProcessPayment = async () => {
    if (!subscriptionStatus?.signedSubscription) return;
    
    setIsProcessingPayment(true);
    try {
      const res = await fetch("/api/lp/subscription/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscriptionStatus.signedSubscription.id,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        if (result.code === "NO_BANK_ACCOUNT") {
          router.push("/lp/bank-connect");
          return;
        }
        throw new Error(result.message || "Payment processing failed");
      }

      toast.success("Payment initiated successfully! Funds will be debited within 1-3 business days.");
      fetchSubscriptionStatus();
      fetchFundDetails();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "unauthenticated") {
      router.push("/lp/onboard");
      return;
    }

    fetchInvestorData();
    fetchFundDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, router, fetchFundDetails]);

  // Real-time polling for dashboard updates
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !investor) return;

    const pollInterval = setInterval(() => {
      fetchFundDetails(true);
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [sessionStatus, investor, fetchFundDetails]);

  // Fetch subscription status after NDA is signed
  useEffect(() => {
    if (investor?.ndaSigned && investor?.accreditationStatus !== "PENDING") {
      fetchSubscriptionStatus();
    }
  }, [investor?.ndaSigned, investor?.accreditationStatus, fetchSubscriptionStatus]);

  const fetchInvestorData = async () => {
    try {
      const [meResponse, signaturesResponse, docsResponse] = await Promise.all([
        fetch("/api/lp/me"),
        fetch("/api/lp/pending-signatures"),
        fetch("/api/lp/docs"),
      ]);

      if (!meResponse.ok) {
        if (meResponse.status === 404) {
          router.push("/lp/onboard");
          return;
        }
        throw new Error("Failed to fetch investor data");
      }
      const data = await meResponse.json();
      setInvestor(data.investor);
      setCapitalCalls(data.capitalCalls || []);
      setFundAggregates(data.fundAggregates || []);

      if (data.gateProgress) {
        setGateProgress(data.gateProgress);
      }

      if (signaturesResponse.ok) {
        const sigData = await signaturesResponse.json();
        setPendingSignatures(sigData.pendingSignatures || []);
      }

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setSignedDocs(docsData.documents || []);
      }

      try {
        const bankRes = await fetch("/api/lp/bank/status");
        if (bankRes.ok) {
          const bankData = await bankRes.json();
          setBankStatus(bankData);
        }
      } catch (e) {
        console.error("Error fetching bank status:", e);
      }

      const ndaGateEnabled = data.ndaGateEnabled !== false;
      const gateIncomplete = data.gateProgress 
        ? data.gateProgress.completionPercentage < 100
        : (!data.investor.ndaSigned || data.investor.accreditationStatus === "PENDING");
      
      if (ndaGateEnabled && gateIncomplete) {
        setShowNdaModal(true);
      }
    } catch (error) {
      console.error("Error fetching investor data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToStep2 = ndaAccepted && ndaSignature;
  const canSubmit = 
    accreditationData.confirmAccredited && 
    accreditationData.confirmRiskAware &&
    (accreditationData.confirmIncome || accreditationData.confirmNetWorth);

  const handleNdaSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lp/complete-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ndaAccepted,
          ndaSignature,
          accreditationType: accreditationData.confirmIncome && accreditationData.confirmNetWorth 
            ? "INCOME_AND_NET_WORTH" 
            : accreditationData.confirmIncome 
              ? "INCOME" 
              : "NET_WORTH",
          confirmIncome: accreditationData.confirmIncome,
          confirmNetWorth: accreditationData.confirmNetWorth,
          confirmAccredited: accreditationData.confirmAccredited,
          confirmRiskAware: accreditationData.confirmRiskAware,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete verification");
      }

      setShowResendConfirmation(true);
      setTimeout(() => {
        setShowResendConfirmation(false);
        setShowNdaModal(false);
        setWizardStep(1);
        fetchInvestorData();
      }, 3000);
    } catch (error) {
      console.error("Error completing gate:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNote = async () => {
    if (!noteContent.trim()) return;

    setNoteSending(true);
    try {
      const res = await fetch("/api/lp/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      if (res.ok) {
        setNoteContent("");
        setNoteSent(true);
        setTimeout(() => setNoteSent(false), 3000);
        fetchFundDetails(true);
      }
    } catch (error) {
      console.error("Error sending note:", error);
    } finally {
      setNoteSending(false);
    }
  };

  const handleSendNoteFromCard = async (content: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/lp/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        fetchFundDetails(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error sending note:", error);
      return false;
    }
  };

  const handleRefresh = () => {
    fetchInvestorData();
    fetchFundDetails();
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num.toLocaleString()}`;
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  const primaryFund = fundAggregates[0];
  const fundRaiseProgress = primaryFund && parseFloat(primaryFund.targetRaise) > 0
    ? Math.min(100, Math.round((parseFloat(primaryFund.currentRaise) / parseFloat(primaryFund.targetRaise)) * 100))
    : 0;
  const currentRaise = primaryFund ? parseFloat(primaryFund.currentRaise) : 0;
  const targetRaise = primaryFund ? parseFloat(primaryFund.targetRaise) : 0;
  const totalCommitment = investor?.totalCommitment || 0;
  const totalFunded = investor?.totalFunded || 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <nav className="bg-black/50 backdrop-blur border-b border-gray-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/lp/dashboard" className="text-xl font-bold text-white">
                BF Fund
              </Link>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link
                  href="/viewer-redirect?mode=visitor"
                  className="text-gray-400 hover:text-white text-sm hidden sm:inline transition-colors"
                >
                  View Dataroom
                </Link>
                <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">
                  {session?.user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => router.push("/api/auth/signout")}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Subscription Banner - Sticky after NDA gate */}
        {!bannerDismissed && subscriptionStatus && (
          <SubscriptionBanner
            status={
              subscriptionStatus.processingSubscription?.status === "COMPLETED"
                ? "completed"
                : subscriptionStatus.processingSubscription?.status === "PAYMENT_PROCESSING"
                ? "processing"
                : subscriptionStatus.signedSubscription
                ? "signed"
                : subscriptionStatus.pendingSubscription
                ? "pending"
                : subscriptionStatus.canSubscribe
                ? "available"
                : "none"
            }
            fundName={
              subscriptionStatus.processingSubscription?.fundName ||
              subscriptionStatus.signedSubscription?.fundName ||
              subscriptionStatus.fund?.name ||
              subscriptionStatus.pendingSubscription?.fundName
            }
            pendingAmount={
              subscriptionStatus.processingSubscription
                ? parseFloat(subscriptionStatus.processingSubscription.amount)
                : subscriptionStatus.signedSubscription
                ? parseFloat(subscriptionStatus.signedSubscription.amount)
                : subscriptionStatus.pendingSubscription
                ? parseFloat(subscriptionStatus.pendingSubscription.amount)
                : undefined
            }
            hasBankAccount={subscriptionStatus.hasBankAccount}
            onSubscribe={() => setShowSubscriptionModal(true)}
            onSignPending={() => {
              if (subscriptionStatus.pendingSubscription?.signingToken) {
                window.location.href = `/view/sign/${subscriptionStatus.pendingSubscription.signingToken}`;
              }
            }}
            onCompletePayment={handleProcessPayment}
            onConnectBank={() => router.push("/lp/bank-connect")}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome, {investor?.entityName || session?.user?.name || "Investor"}
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Your personalized investor portal
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {fundDetailsError && (
            <Card className="bg-red-900/20 border-red-700/50 mb-6">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-300">{fundDetailsError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-red-700 text-red-300 hover:bg-red-900/30"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {investor && (!investor.ndaSigned || investor.accreditationStatus === "PENDING" || !bankStatus?.hasBankLink) && (
            <div className="mb-6">
              <WelcomeBanner
                investorName={investor.entityName || session?.user?.name || "Investor"}
                ndaSigned={investor.ndaSigned}
                accreditationStatus={investor.accreditationStatus}
                hasBankLink={bankStatus?.hasBankLink || false}
                hasInvestments={(fundDetails?.funds?.length || 0) > 0}
                onStartNda={() => setShowNdaModal(true)}
                onStartAccreditation={() => setWizardStep(1)}
                onConnectBank={() => router.push("/lp/bank-connect")}
              />
            </div>
          )}

          {!fundDetailsLoaded && !fundDetailsError && (
            <div className="mb-6 sm:mb-8">
              <DashboardSkeleton />
            </div>
          )}

          {fundDetailsLoaded && !fundDetails && !fundDetailsError && (
            <div className="mb-6 sm:mb-8">
              <EmptyState
                title="No investments yet"
                description="You haven't made any investments yet. Complete your onboarding to get started with available fund opportunities."
                icon="chart"
                showRefresh
                onRefresh={handleRefresh}
              />
            </div>
          )}

          {fundDetails && (
            <div className="mb-6 sm:mb-8">
              <DashboardSummary
                summary={fundDetails.summary}
                documentsCount={fundDetails.documents.length}
                ndaSigned={investor?.ndaSigned || false}
                accreditationStatus={investor?.accreditationStatus || "PENDING"}
                formatCurrency={formatCurrency}
                lastUpdated={fundDetails.lastUpdated}
              />
            </div>
          )}

          {/* Quick Actions CTAs */}
          {investor && (
            <div className="mb-6 sm:mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {subscriptionStatus?.canSubscribe && !subscriptionStatus.hasSubscription && (
                  <Button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="h-auto py-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <TrendingUp className="h-8 w-8" />
                    <span className="text-lg font-semibold">Invest Now</span>
                    <span className="text-xs opacity-80">Subscribe to fund</span>
                  </Button>
                )}
                {!investor.ndaSigned && (
                  <Button
                    onClick={() => setShowNdaModal(true)}
                    className="h-auto py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <FileText className="h-8 w-8" />
                    <span className="text-lg font-semibold">Sign NDA</span>
                    <span className="text-xs opacity-80">Get started</span>
                  </Button>
                )}
                {investor.ndaSigned && investor.accreditationStatus === "PENDING" && (
                  <Button
                    onClick={() => setShowNdaModal(true)}
                    className="h-auto py-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                    <span className="text-lg font-semibold">Verify Status</span>
                    <span className="text-xs opacity-80">Complete accreditation</span>
                  </Button>
                )}
                {!bankStatus?.hasBankLink && bankStatus?.configured && (
                  <Button
                    onClick={() => router.push("/lp/bank-connect")}
                    className="h-auto py-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Building2 className="h-8 w-8" />
                    <span className="text-lg font-semibold">Link Bank</span>
                    <span className="text-xs opacity-80">For transfers</span>
                  </Button>
                )}
                {pendingSignatures.length > 0 && (
                  <a
                    href={`/view/sign/${pendingSignatures[0].signingToken}`}
                    className="h-auto py-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white flex flex-col items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all rounded-md"
                  >
                    <PenTool className="h-8 w-8" />
                    <span className="text-lg font-semibold">Sign Document</span>
                    <span className="text-xs opacity-80">{pendingSignatures.length} pending</span>
                  </a>
                )}
                <Button
                  onClick={() => router.push("/lp/docs")}
                  variant="outline"
                  className="h-auto py-6 border-gray-700 text-gray-300 hover:bg-gray-800 flex flex-col items-center justify-center gap-2"
                >
                  <FileText className="h-8 w-8" />
                  <span className="text-lg font-semibold">Documents</span>
                  <span className="text-xs opacity-80">View signed docs</span>
                </Button>
              </div>
            </div>
          )}

          {fundDetails && fundDetails.funds.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Your Fund Investments</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {fundDetails.funds.map((fund) => (
                  <FundCard key={fund.id} fund={fund} formatCurrency={formatCurrency} />
                ))}
              </div>
            </div>
          )}

          {pendingSignatures.length > 0 && (
            <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-700/50 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <PenTool className="h-5 w-5 mr-2 text-amber-400" />
                  Action Required: Documents to Sign
                </CardTitle>
                <CardDescription className="text-amber-200/70">
                  You have {pendingSignatures.length} document{pendingSignatures.length > 1 ? "s" : ""} awaiting your signature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingSignatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between p-4 bg-gray-800/70 rounded-lg border border-amber-700/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                          <FileText className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{sig.documentTitle}</p>
                          <p className="text-gray-400 text-sm">
                            From {sig.teamName} {sig.sentAt && `• Sent ${new Date(sig.sentAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/view/sign/${sig.signingToken}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <PenTool className="h-4 w-4" />
                        Sign Now
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KYC Verification - Only show after NDA is signed */}
          {investor?.ndaSigned && (
            <div className="mb-6">
              <KycVerification />
            </div>
          )}

          {bankStatus?.configured && (
            <Card className={`mb-6 ${bankStatus.hasBankLink ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-blue-900/20 border-blue-700/50'}`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  {bankStatus.hasBankLink ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-400" />
                      Bank Account Connected
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2 text-blue-400" />
                      Connect Your Bank Account
                    </>
                  )}
                </CardTitle>
                <CardDescription className={bankStatus.hasBankLink ? "text-emerald-200/70" : "text-blue-200/70"}>
                  {bankStatus.hasBankLink
                    ? "Your bank is linked for capital calls and distributions"
                    : "Link your bank for easy capital call payments and distributions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bankStatus.hasBankLink && bankStatus.bankLink ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{bankStatus.bankLink.institutionName || "Bank Account"}</p>
                        <p className="text-gray-400 text-sm">
                          {bankStatus.bankLink.accountName} ••••{bankStatus.bankLink.accountMask}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      onClick={() => router.push("/lp/bank-connect")}
                    >
                      Manage
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => router.push("/lp/bank-connect")}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Connect Bank Account
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-500" />
                    Capital Calls
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Outstanding capital call notices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {capitalCalls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p>No capital calls at this time</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {capitalCalls.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                        >
                          <div>
                            <p className="text-white font-medium">
                              Capital Call #{call.callNumber}
                            </p>
                            <p className="text-gray-400 text-sm">
                              Due: {new Date(call.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">${call.amount}</p>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                call.status === "PAID"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {call.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <DocumentsVault
                documents={fundDetails?.documents || signedDocs.map(d => ({
                  id: d.id,
                  title: d.title,
                  documentType: d.documentType,
                  fileUrl: d.fileUrl,
                  signedAt: d.signedAt,
                  createdAt: d.createdAt,
                }))}
                ndaSigned={investor?.ndaSigned || false}
                accreditationStatus={investor?.accreditationStatus || "PENDING"}
                onViewAll={() => router.push("/lp/docs")}
              />
            </div>

            <div className="space-y-6">
              <NotesCard
                notes={fundDetails?.notes || []}
                onSendNote={handleSendNoteFromCard}
              />
            </div>
          </div>

          <div className="mt-6">
            <ActivityTimeline />
          </div>
        </main>

        <Dialog open={showNdaModal} onOpenChange={() => {}}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg sm:max-w-xl">
            {showResendConfirmation ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Verification Complete!</h3>
                <p className="text-gray-400 mb-4">
                  A confirmation email has been sent to your inbox.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-400 border-emerald-600 hover:bg-emerald-600/20"
                  onClick={async () => {
                    try {
                      await fetch("/api/lp/complete-gate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ resendConfirmation: true }),
                      });
                    } catch (e) {
                      console.error("Resend error:", e);
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend Confirmation
                </Button>
              </div>
            ) : (
            <>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {wizardStep === 1 ? "Non-Disclosure Agreement" : "Accredited Investor Verification"}
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                {wizardStep === 1 
                  ? "Step 1 of 2: Review and accept the confidentiality agreement"
                  : "Step 2 of 2: Confirm your accredited investor status (SEC 506(c))"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Verification Progress</span>
                  <span className="text-emerald-400 font-medium">
                    {wizardStep === 1 ? (ndaAccepted ? "50%" : "0%") : (canSubmit ? "100%" : "75%")}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ 
                      width: wizardStep === 1 
                        ? (ndaAccepted ? "50%" : "0%") 
                        : (canSubmit ? "100%" : "75%") 
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                        wizardStep > 1 || (wizardStep === 1 && ndaAccepted) ? "bg-emerald-600" : wizardStep === 1 ? "bg-emerald-600/50 ring-2 ring-emerald-400" : "bg-gray-700"
                      }`}
                    >
                      {wizardStep > 1 ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : "1"}
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-400 mt-1">NDA</span>
                  </div>
                  <div className={`w-12 sm:w-20 h-1 rounded transition-colors ${wizardStep > 1 ? "bg-emerald-600" : "bg-gray-700"}`} />
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                        canSubmit && wizardStep === 2 ? "bg-emerald-600" : wizardStep === 2 ? "bg-emerald-600/50 ring-2 ring-emerald-400" : "bg-gray-700"
                      }`}
                    >
                      2
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-400 mt-1">Accreditation</span>
                  </div>
                </div>
              </div>

              {wizardStep === 1 ? (
                <>
                  <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="nda"
                        checked={ndaAccepted}
                        onCheckedChange={(checked) => setNdaAccepted(checked as boolean)}
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="nda" className="text-white font-medium cursor-pointer">
                          I Accept the Non-Disclosure Agreement
                        </Label>
                        <p className="text-gray-400 text-sm mt-2">
                          I agree to keep all fund information, investment terms, and related materials 
                          strictly confidential. I will not share, distribute, or disclose any information 
                          to third parties without prior written consent from the fund manager.
                        </p>
                      </div>
                    </div>
                    
                    {ndaAccepted && (
                      <div className="pt-4 border-t border-gray-600">
                        <Label className="text-white font-medium mb-3 block">
                          <PenTool className="inline h-4 w-4 mr-2" />
                          Sign Below
                        </Label>
                        <SignaturePad onSignatureChange={setNdaSignature} />
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => setWizardStep(2)}
                    disabled={!canProceedToStep2}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
                  >
                    Continue to Accreditation
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                    <p className="text-blue-200 text-sm">
                      This is a Rule 506(c) offering. By law, we must take reasonable steps to verify 
                      that all investors are accredited. Please confirm your status below.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-white font-medium">Select at least one that applies:</p>
                    
                    <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="income"
                          checked={accreditationData.confirmIncome}
                          onCheckedChange={(checked) => 
                            setAccreditationData(prev => ({ ...prev, confirmIncome: checked as boolean }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="income" className="text-white font-medium cursor-pointer">
                            Income Qualification
                          </Label>
                          <p className="text-gray-400 text-sm mt-1">
                            I have earned individual income exceeding $200,000 (or $300,000 with spouse) 
                            in each of the past two years and expect the same this year.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="networth"
                          checked={accreditationData.confirmNetWorth}
                          onCheckedChange={(checked) => 
                            setAccreditationData(prev => ({ ...prev, confirmNetWorth: checked as boolean }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="networth" className="text-white font-medium cursor-pointer">
                            Net Worth Qualification
                          </Label>
                          <p className="text-gray-400 text-sm mt-1">
                            I have a net worth exceeding $1,000,000, either individually or with my spouse, 
                            excluding my primary residence.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-white font-medium">Required acknowledgments:</p>
                    
                    <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="confirmAccredited"
                          checked={accreditationData.confirmAccredited}
                          onCheckedChange={(checked) => 
                            setAccreditationData(prev => ({ ...prev, confirmAccredited: checked as boolean }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="confirmAccredited" className="text-white font-medium cursor-pointer">
                            I Confirm I Am an Accredited Investor
                          </Label>
                          <p className="text-gray-400 text-sm mt-1">
                            I certify that I meet the SEC definition of an accredited investor under Rule 501 
                            of Regulation D.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="riskAware"
                          checked={accreditationData.confirmRiskAware}
                          onCheckedChange={(checked) => 
                            setAccreditationData(prev => ({ ...prev, confirmRiskAware: checked as boolean }))
                          }
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="riskAware" className="text-white font-medium cursor-pointer">
                            I Understand the Investment Risks
                          </Label>
                          <p className="text-gray-400 text-sm mt-1">
                            I understand that private fund investments are illiquid, carry significant risk 
                            of loss, and are suitable only for accredited investors.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setWizardStep(1)}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNdaSubmit}
                      disabled={!canSubmit || isSubmitting}
                      className="flex-[2] bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
                    >
                      {isSubmitting ? "Processing..." : "Confirm & Access Dashboard"}
                    </Button>
                  </div>
                </>
              )}
            </div>
            </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        entityName={subscriptionStatus?.entityName || investor?.entityName || null}
        fund={subscriptionStatus?.fund}
        onSubscribe={handleSubscribe}
      />
    </>
  );
}
