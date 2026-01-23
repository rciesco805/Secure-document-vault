import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";

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
} from "lucide-react";
import { KycVerification } from "@/components/lp/kyc-verification";

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
}

interface CapitalCall {
  id: string;
  callNumber: number;
  amount: string;
  dueDate: string;
  status: string;
  fundName: string;
}

export default function LPDashboard() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [investor, setInvestor] = useState<InvestorData | null>(null);
  const [capitalCalls, setCapitalCalls] = useState<CapitalCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [ndaAccepted, setNdaAccepted] = useState(false);
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

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "unauthenticated") {
      router.push("/lp/onboard");
      return;
    }

    fetchInvestorData();
  }, [sessionStatus, router]);

  const fetchInvestorData = async () => {
    try {
      const [meResponse, signaturesResponse] = await Promise.all([
        fetch("/api/lp/me"),
        fetch("/api/lp/pending-signatures"),
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

      // Set gate progress from API
      if (data.gateProgress) {
        setGateProgress(data.gateProgress);
      }

      if (signaturesResponse.ok) {
        const sigData = await signaturesResponse.json();
        setPendingSignatures(sigData.pendingSignatures || []);
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

  const canProceedToStep2 = ndaAccepted;
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

      setShowNdaModal(false);
      setWizardStep(1);
      fetchInvestorData();
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
      await fetch("/api/lp/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      setNoteContent("");
    } catch (error) {
      console.error("Error sending note:", error);
    } finally {
      setNoteSending(false);
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  const fundRaiseProgress = 65;
  const currentRaise = 3250000;
  const targetRaise = 5000000;

  return (
    <>
      <Head>
        <title>Investor Dashboard | BF Fund</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <nav className="bg-black/50 backdrop-blur border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/lp/dashboard" className="text-xl font-bold text-white">
                BF Fund
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              Welcome, {session?.user?.name || "Investor"}
            </h1>
            <p className="text-gray-400 mt-1">
              Your personalized investor portal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-emerald-500" />
                  Fund Raise Progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {fundRaiseProgress}%
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${fundRaiseProgress}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  ${(currentRaise / 1000000).toFixed(1)}M of ${(targetRaise / 1000000).toFixed(1)}M
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-blue-500" />
                  Your Commitment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">$0</div>
                <p className="text-gray-500 text-xs mt-2">No active commitments</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Signed Documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {investor?.signedDocs?.length || 0}
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  {investor?.ndaSigned ? "NDA completed" : "Pending NDA"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-amber-500" />
                  Accreditation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {investor?.accreditationStatus === "VERIFIED" ? (
                    <span className="text-emerald-500">Verified</span>
                  ) : (
                    <span className="text-amber-500">Self-Certified</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-2">506(c) compliant</p>
              </CardContent>
            </Card>
          </div>

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
                        href={`/sign/${sig.signingToken}`}
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

          <div className="mb-6">
            <KycVerification />
          </div>

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
            <Card className="lg:col-span-2 bg-gray-800/50 border-gray-700">
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

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-emerald-500" />
                  Message GP
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Send a note to the fund manager
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Type your message here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 min-h-[100px]"
                />
                <Button
                  onClick={handleSendNote}
                  disabled={!noteContent.trim() || noteSending}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {noteSending ? "Sending..." : "Send Message"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-purple-500" />
                    Your Documents
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Signed agreements and fund documents
                  </CardDescription>
                </div>
                <Link href="/lp/docs">
                  <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {investor?.ndaSigned && (
                    <div className="p-4 bg-gray-700/50 rounded-lg flex items-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mr-3" />
                      <div>
                        <p className="text-white font-medium">NDA</p>
                        <p className="text-gray-400 text-sm">Signed</p>
                      </div>
                    </div>
                  )}
                  {investor?.accreditationStatus !== "PENDING" && (
                    <div className="p-4 bg-gray-700/50 rounded-lg flex items-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mr-3" />
                      <div>
                        <p className="text-white font-medium">Accreditation</p>
                        <p className="text-gray-400 text-sm">Self-Certified</p>
                      </div>
                    </div>
                  )}
                  {investor?.documents && investor.documents.length > 0 && investor.documents.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="p-4 bg-gray-700/50 rounded-lg flex items-center">
                      <FileText className="h-8 w-8 text-purple-500 mr-3" />
                      <div>
                        <p className="text-white font-medium">{doc.title}</p>
                        <p className="text-gray-400 text-sm">
                          {doc.signedAt ? `Signed ${new Date(doc.signedAt).toLocaleDateString()}` : doc.documentType}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!investor?.ndaSigned && investor?.accreditationStatus === "PENDING" && (!investor?.documents || investor.documents.length === 0)) && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p>Complete NDA and accreditation to access documents</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Dialog open={showNdaModal} onOpenChange={() => {}}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg sm:max-w-xl">
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
                  <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
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
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
