import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  FileTextIcon,
  UploadIcon,
  DollarSignIcon,
  UserIcon,
  SendIcon,
  CheckCircle2,
} from "lucide-react";

import { putFile } from "@/lib/files/put-file";
import { useTeam } from "@/context/team-context";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface Investor {
  id: string;
  entityName: string | null;
  user: {
    name: string | null;
    email: string;
  } | null;
}

interface Fund {
  id: string;
  name: string;
}

export default function NewSubscriptionPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    investorId: "",
    fundId: "",
    amount: "",
    title: "",
    description: "",
    emailSubject: "",
    emailMessage: "",
  });

  useEffect(() => {
    if (teamId) {
      fetchInvestors();
      fetchFunds();
    }
  }, [teamId]);

  const fetchInvestors = async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/investors`);
      if (res.ok) {
        const data = await res.json();
        setInvestors(data.investors || []);
      }
    } catch (error) {
      console.error("Error fetching investors:", error);
    }
  };

  const fetchFunds = async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/funds`);
      if (res.ok) {
        const data = await res.json();
        setFunds(data.funds || []);
      }
    } catch (error) {
      console.error("Error fetching funds:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setCurrentFile(file);
    setFormData((prev) => ({
      ...prev,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      setCurrentFile(file);
      setFormData((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.investorId) {
      toast.error("Please select an investor");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid subscription amount");
      return;
    }

    if (!currentFile) {
      toast.error("Please upload a subscription agreement PDF");
      return;
    }

    setIsLoading(true);

    try {
      setIsUploading(true);
      const uploadResult = await putFile({
        file: currentFile,
        teamId: teamId!,
      });
      setFileUrl(uploadResult.data);
      setIsUploading(false);

      const res = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          file: uploadResult.data,
          teamId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create subscription");
      }

      const data = await res.json();
      setIsSuccess(true);
      toast.success("Subscription pushed for signing!");

      setTimeout(() => {
        router.push("/sign");
      }, 2000);
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast.error(error.message || "Failed to push subscription");
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Subscription Sent!</h2>
              <p className="text-muted-foreground mb-4">
                The investor has been notified and can now sign the subscription agreement.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to documents...
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head>
        <title>Push Subscription | BF Fund</title>
      </Head>

      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/sign">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Push Subscription Agreement</h1>
            <p className="text-muted-foreground">
              Upload and send a subscription agreement for investor signing
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Investor Details
              </CardTitle>
              <CardDescription>
                Select the investor and subscription amount
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investor">Investor *</Label>
                  <Select
                    value={formData.investorId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, investorId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select investor" />
                    </SelectTrigger>
                    <SelectContent>
                      {investors.map((investor) => (
                        <SelectItem key={investor.id} value={investor.id}>
                          {investor.entityName || investor.user?.name || investor.user?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fund">Fund (optional)</Label>
                  <Select
                    value={formData.fundId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, fundId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Subscription Amount *</Label>
                <div className="relative">
                  <DollarSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="100,000"
                    className="pl-9"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Subscription Agreement
              </CardTitle>
              <CardDescription>
                Upload the subscription agreement PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  currentFile
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-300 dark:border-gray-700 hover:border-primary"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDrop}
              >
                {currentFile ? (
                  <div className="space-y-2">
                    <FileTextIcon className="h-12 w-12 mx-auto text-emerald-600" />
                    <p className="font-medium">{currentFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Drag and drop a PDF, or click to select
                    </p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      Select PDF
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  placeholder="Subscription Agreement"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional notes about this subscription..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SendIcon className="h-5 w-5" />
                Email Notification
              </CardTitle>
              <CardDescription>
                Customize the email sent to the investor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailSubject">Email Subject</Label>
                <Input
                  id="emailSubject"
                  placeholder="Action Required: Sign Your Subscription Agreement"
                  value={formData.emailSubject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, emailSubject: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailMessage">Email Message</Label>
                <Textarea
                  id="emailMessage"
                  placeholder="Please review and sign your subscription agreement..."
                  rows={4}
                  value={formData.emailMessage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, emailMessage: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/sign">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isLoading || !formData.investorId || !formData.amount || !currentFile}
              className="min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Sending..."}
                </>
              ) : (
                <>
                  <SendIcon className="h-4 w-4 mr-2" />
                  Push for Signing
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
