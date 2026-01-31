"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, FileText, Loader2, Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useTeam } from "@/context/team-context";

type Investor = {
  id: string;
  user: {
    name: string | null;
    email: string;
  };
};

type Fund = {
  id: string;
  name: string;
};

const DOCUMENT_TYPES = [
  { value: "SUBSCRIPTION_AGREEMENT", label: "Subscription Agreement" },
  { value: "SIDE_LETTER", label: "Side Letter" },
  { value: "AMENDMENT", label: "Amendment" },
  { value: "TRANSFER", label: "Transfer Agreement" },
  { value: "OTHER", label: "Other" },
];

const TRANSFER_METHODS = [
  { value: "ACH", label: "ACH Transfer" },
  { value: "WIRE", label: "Wire Transfer" },
  { value: "CHECK", label: "Check" },
  { value: "CRYPTO", label: "Cryptocurrency" },
  { value: "OTHER", label: "Other" },
];

const TRANSFER_STATUS = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

export default function ManualInvestmentPageClient() {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [loading, setLoading] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [investorId, setInvestorId] = useState("");
  const [fundId, setFundId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [fundedAmount, setFundedAmount] = useState("");
  const [units, setUnits] = useState("");
  const [shares, setShares] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [ownershipPercent, setOwnershipPercent] = useState("");
  const [signedDate, setSignedDate] = useState<Date | undefined>();
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>();
  const [fundedDate, setFundedDate] = useState<Date | undefined>();
  const [transferMethod, setTransferMethod] = useState("");
  const [transferStatus, setTransferStatus] = useState("PENDING");
  const [transferDate, setTransferDate] = useState<Date | undefined>();
  const [transferRef, setTransferRef] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [investorsRes, fundsRes] = await Promise.all([
          fetch(`/api/teams/${teamId}/investors`),
          fetch(`/api/teams/${teamId}/funds`),
        ]);

        if (investorsRes.ok) {
          const data = await investorsRes.json();
          setInvestors(data.investors || []);
        }

        if (fundsRes.ok) {
          const data = await fundsRes.json();
          setFunds(data.funds || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!investorId || !fundId || !documentType || !documentTitle || !commitmentAmount || !signedDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/manual-investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId,
          fundId,
          documentType,
          documentTitle,
          documentNumber: documentNumber || null,
          commitmentAmount: parseFloat(commitmentAmount),
          fundedAmount: fundedAmount ? parseFloat(fundedAmount) : null,
          units: units ? parseFloat(units) : null,
          shares: shares ? parseFloat(shares) : null,
          pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
          ownershipPercent: ownershipPercent ? parseFloat(ownershipPercent) : null,
          signedDate: signedDate.toISOString(),
          effectiveDate: effectiveDate?.toISOString() || null,
          fundedDate: fundedDate?.toISOString() || null,
          transferMethod: transferMethod || null,
          transferStatus,
          transferDate: transferDate?.toISOString() || null,
          transferRef: transferRef || null,
          bankName: bankName || null,
          accountLast4: accountLast4 || null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const { message } = await response.json();
        toast.error(message || "Failed to create investment record");
        return;
      }

      toast.success("Manual investment record created successfully");
      router.push("/admin/fund");
    } catch (error) {
      console.error("Error creating investment:", error);
      toast.error("Error creating investment record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Add Manual Investment
            </CardTitle>
            <CardDescription>
              Record an off-platform investment or document that was signed outside the system.
              This creates a permanent record for compliance and reporting purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Investor & Fund</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="investor">Investor *</Label>
                      <Select value={investorId} onValueChange={setInvestorId}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select investor" />
                        </SelectTrigger>
                        <SelectContent>
                          {investors.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.user.name || inv.user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fund">Fund *</Label>
                      <Select value={fundId} onValueChange={setFundId}>
                        <SelectTrigger className="mt-1.5">
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
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Document Details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="documentType">Document Type *</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="documentNumber">Document Number</Label>
                      <Input
                        id="documentNumber"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        placeholder="e.g., SUB-2024-001"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="documentTitle">Document Title *</Label>
                    <Input
                      id="documentTitle"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="e.g., Subscription Agreement - Series A"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Investment Details
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="commitmentAmount">Commitment Amount (USD) *</Label>
                      <Input
                        id="commitmentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={commitmentAmount}
                        onChange={(e) => setCommitmentAmount(e.target.value)}
                        placeholder="100000.00"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fundedAmount">Funded Amount (USD)</Label>
                      <Input
                        id="fundedAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={fundedAmount}
                        onChange={(e) => setFundedAmount(e.target.value)}
                        placeholder="50000.00"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="units">Units</Label>
                      <Input
                        id="units"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        placeholder="1000"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shares">Shares</Label>
                      <Input
                        id="shares"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        placeholder="500"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pricePerUnit">Price Per Unit</Label>
                      <Input
                        id="pricePerUnit"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                        placeholder="100.00"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ownershipPercent">Ownership %</Label>
                      <Input
                        id="ownershipPercent"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={ownershipPercent}
                        onChange={(e) => setOwnershipPercent(e.target.value)}
                        placeholder="5.25"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-purple-500" />
                    Important Dates
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Signed Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "mt-1.5 w-full justify-start text-left font-normal",
                              !signedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {signedDate ? format(signedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={signedDate}
                            onSelect={setSignedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Effective Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "mt-1.5 w-full justify-start text-left font-normal",
                              !effectiveDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {effectiveDate ? format(effectiveDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={effectiveDate}
                            onSelect={setEffectiveDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Funded Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "mt-1.5 w-full justify-start text-left font-normal",
                              !fundedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fundedDate ? format(fundedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={fundedDate}
                            onSelect={setFundedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Transfer Details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="transferMethod">Transfer Method</Label>
                      <Select value={transferMethod} onValueChange={setTransferMethod}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFER_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="transferStatus">Transfer Status</Label>
                      <Select value={transferStatus} onValueChange={setTransferStatus}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFER_STATUS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Transfer Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "mt-1.5 w-full justify-start text-left font-normal",
                              !transferDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {transferDate ? format(transferDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={transferDate}
                            onSelect={setTransferDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="transferRef">Transfer Reference</Label>
                      <Input
                        id="transferRef"
                        value={transferRef}
                        onChange={(e) => setTransferRef(e.target.value)}
                        placeholder="Wire ref or ACH ID"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g., Chase, Bank of America"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountLast4">Account Last 4</Label>
                      <Input
                        id="accountLast4"
                        value={accountLast4}
                        onChange={(e) => setAccountLast4(e.target.value.slice(0, 4))}
                        placeholder="1234"
                        maxLength={4}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Notes</h3>
                  <div>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes or context about this investment..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Investment Record
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
