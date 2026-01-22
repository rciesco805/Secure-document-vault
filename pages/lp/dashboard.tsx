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
} from "lucide-react";

interface InvestorDocument {
  id: string;
  title: string;
  documentType: string;
  signedAt: string | null;
  createdAt: string;
}

interface InvestorData {
  id: string;
  entityName: string | null;
  ndaSigned: boolean;
  accreditationStatus: string;
  fundData: any;
  signedDocs: any[];
  documents: InvestorDocument[];
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
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [accreditationAck, setAccreditationAck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteSending, setNoteSending] = useState(false);

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
      const response = await fetch("/api/lp/me");
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/lp/onboard");
          return;
        }
        throw new Error("Failed to fetch investor data");
      }
      const data = await response.json();
      setInvestor(data.investor);
      setCapitalCalls(data.capitalCalls || []);

      if (!data.investor.ndaSigned || data.investor.accreditationStatus === "PENDING") {
        setShowNdaModal(true);
      }
    } catch (error) {
      console.error("Error fetching investor data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNdaSubmit = async () => {
    if (!ndaAccepted || !accreditationAck) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lp/complete-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ndaAccepted,
          accreditationAck,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete verification");
      }

      setShowNdaModal(false);
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
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Complete Verification
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Please review and accept the following to access your investor portal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      ndaAccepted ? "bg-emerald-600" : "bg-gray-700"
                    }`}
                  >
                    1
                  </div>
                  <div className="w-16 h-0.5 bg-gray-700" />
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      accreditationAck ? "bg-emerald-600" : "bg-gray-700"
                    }`}
                  >
                    2
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="nda"
                    checked={ndaAccepted}
                    onCheckedChange={(checked) => setNdaAccepted(checked as boolean)}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="nda" className="text-white font-medium cursor-pointer">
                      Non-Disclosure Agreement
                    </Label>
                    <p className="text-gray-400 text-sm mt-1">
                      I agree to keep all fund information confidential and will not share
                      materials with third parties without prior written consent.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="accreditation"
                    checked={accreditationAck}
                    onCheckedChange={(checked) => setAccreditationAck(checked as boolean)}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="accreditation" className="text-white font-medium cursor-pointer">
                      Accredited Investor Acknowledgment
                    </Label>
                    <p className="text-gray-400 text-sm mt-1">
                      I certify that I am an accredited investor as defined under SEC Rule 501
                      of Regulation D. I understand this is a 506(c) offering.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNdaSubmit}
                disabled={!ndaAccepted || !accreditationAck || isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? "Processing..." : "Continue to Dashboard"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
