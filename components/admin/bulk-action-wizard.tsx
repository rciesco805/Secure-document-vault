import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface Investor {
  id: string;
  name: string;
  email: string;
  entityName: string | null;
  commitment: number;
  funded: number;
  uncalled: number;
  hasBankLink: boolean;
}

interface BulkActionWizardProps {
  fundId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ActionType = "CAPITAL_CALL" | "DISTRIBUTION";
type Step = "type" | "investors" | "amount" | "review" | "processing" | "complete";

export function BulkActionWizard({
  fundId,
  isOpen,
  onClose,
  onComplete,
}: BulkActionWizardProps) {
  const [step, setStep] = useState<Step>("type");
  const [actionType, setActionType] = useState<ActionType>("CAPITAL_CALL");
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const [callAmount, setCallAmount] = useState("");
  const [callPercentage, setCallPercentage] = useState("");
  const [amountMode, setAmountMode] = useState<"fixed" | "percentage">("percentage");
  const [dueDate, setDueDate] = useState("");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    if (isOpen && fundId) {
      fetchInvestors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fundId]);

  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/capital-tracking?fundId=${fundId}`);
      if (res.ok) {
        const data = await res.json();
        const investorData = (data.investors || []).map((inv: any) => ({
          ...inv,
          hasBankLink: true,
        }));
        setInvestors(investorData);
      }
    } catch (error) {
      console.error("Failed to fetch investors:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep("type");
    setActionType("CAPITAL_CALL");
    setSelectedInvestors(new Set());
    setCallAmount("");
    setCallPercentage("");
    setAmountMode("percentage");
    setDueDate("");
    setPurpose("");
    setProgress(0);
    setResults({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const toggleInvestor = (id: string) => {
    const newSelected = new Set(selectedInvestors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvestors(newSelected);
  };

  const selectAll = () => {
    if (selectedInvestors.size === investors.length) {
      setSelectedInvestors(new Set());
    } else {
      setSelectedInvestors(new Set(investors.map((i) => i.id)));
    }
  };

  const calculateAmount = (investor: Investor) => {
    if (amountMode === "fixed") {
      return parseFloat(callAmount) || 0;
    }
    const pct = parseFloat(callPercentage) || 0;
    if (actionType === "CAPITAL_CALL") {
      return (investor.uncalled * pct) / 100;
    }
    return (investor.funded * pct) / 100;
  };

  const getTotalAmount = () => {
    return Array.from(selectedInvestors).reduce((sum, id) => {
      const investor = investors.find((i) => i.id === id);
      return sum + (investor ? calculateAmount(investor) : 0);
    }, 0);
  };

  const handleProcess = async () => {
    setStep("processing");
    setProcessing(true);
    setProgress(10);

    try {
      const selectedList = Array.from(selectedInvestors);
      const totalAmount = getTotalAmount();

      const res = await fetch("/api/admin/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId,
          actionType: actionType === "CAPITAL_CALL" ? "capital_call" : "distribution",
          totalAmount: totalAmount.toString(),
          allocationType: amountMode === "fixed" ? "equal" : "pro_rata",
          selectedInvestors: selectedList,
        }),
      });

      setProgress(100);

      if (res.ok) {
        const data = await res.json();
        setResults({ success: data.allocations?.length || selectedList.length, failed: 0 });
      } else {
        const errorData = await res.json();
        if (errorData.error === "INITIAL_THRESHOLD_NOT_MET") {
          setResults({ success: 0, failed: selectedList.length });
        } else {
          setResults({ success: 0, failed: selectedList.length });
        }
      }
    } catch {
      setResults({ success: 0, failed: selectedInvestors.size });
    }

    setProcessing(false);
    setStep("complete");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const canProceed = () => {
    switch (step) {
      case "type":
        return true;
      case "investors":
        return selectedInvestors.size > 0;
      case "amount":
        if (amountMode === "fixed") {
          return parseFloat(callAmount) > 0;
        }
        return parseFloat(callPercentage) > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ["type", "investors", "amount", "review"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ["type", "investors", "amount", "review"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionType === "CAPITAL_CALL" ? (
              <ArrowDownToLine className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowUpFromLine className="h-5 w-5 text-orange-600" />
            )}
            Bulk {actionType === "CAPITAL_CALL" ? "Capital Call" : "Distribution"} Wizard
          </DialogTitle>
          <DialogDescription>
            {step === "type" && "Select the type of bulk action to perform"}
            {step === "investors" && "Select investors to include in this action"}
            {step === "amount" && "Configure the amount for each investor"}
            {step === "review" && "Review and confirm the bulk action"}
            {step === "processing" && "Processing transactions..."}
            {step === "complete" && "Bulk action complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "type" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActionType("CAPITAL_CALL")}
                  className={`p-6 rounded-lg border-2 text-left transition-colors ${
                    actionType === "CAPITAL_CALL"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <ArrowDownToLine className="h-8 w-8 text-green-600 mb-2" />
                  <h3 className="font-semibold text-lg">Capital Call</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Request capital from investors based on their commitments
                  </p>
                </button>

                <button
                  onClick={() => setActionType("DISTRIBUTION")}
                  className={`p-6 rounded-lg border-2 text-left transition-colors ${
                    actionType === "DISTRIBUTION"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <ArrowUpFromLine className="h-8 w-8 text-orange-600 mb-2" />
                  <h3 className="font-semibold text-lg">Distribution</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribute funds to investors proportionally
                  </p>
                </button>
              </div>
            </div>
          )}

          {step === "investors" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedInvestors.size === investors.length && investors.length > 0}
                    onCheckedChange={selectAll}
                  />
                  <Label>Select All ({investors.length} investors)</Label>
                </div>
                <Badge variant="outline">
                  {selectedInvestors.size} selected
                </Badge>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Investor</TableHead>
                        <TableHead className="text-right">Commitment</TableHead>
                        <TableHead className="text-right">
                          {actionType === "CAPITAL_CALL" ? "Uncalled" : "Funded"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investors.map((investor) => (
                        <TableRow
                          key={investor.id}
                          className="cursor-pointer"
                          onClick={() => toggleInvestor(investor.id)}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedInvestors.has(investor.id)}
                              onCheckedChange={() => toggleInvestor(investor.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {investor.entityName || investor.name || "—"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {investor.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(investor.commitment)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              actionType === "CAPITAL_CALL"
                                ? investor.uncalled
                                : investor.funded
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {step === "amount" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Amount Mode</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAmountMode("percentage")}
                    className={`p-4 rounded-lg border-2 text-left ${
                      amountMode === "percentage"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="font-medium">Percentage</div>
                    <div className="text-sm text-muted-foreground">
                      {actionType === "CAPITAL_CALL"
                        ? "% of uncalled capital"
                        : "% of funded amount"}
                    </div>
                  </button>
                  <button
                    onClick={() => setAmountMode("fixed")}
                    className={`p-4 rounded-lg border-2 text-left ${
                      amountMode === "fixed"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="font-medium">Fixed Amount</div>
                    <div className="text-sm text-muted-foreground">
                      Same amount for each investor
                    </div>
                  </button>
                </div>
              </div>

              {amountMode === "percentage" ? (
                <div className="space-y-2">
                  <Label>Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="25"
                      value={callPercentage}
                      onChange={(e) => setCallPercentage(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {actionType === "CAPITAL_CALL"
                      ? "Percentage of each investor's uncalled capital"
                      : "Percentage of each investor's funded amount"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Amount per Investor</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="25000"
                      value={callAmount}
                      onChange={(e) => setCallAmount(e.target.value)}
                      className="w-48"
                    />
                  </div>
                </div>
              )}

              {actionType === "CAPITAL_CALL" && (
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-48"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Purpose / Description</Label>
                <Textarea
                  placeholder={
                    actionType === "CAPITAL_CALL"
                      ? "e.g., Q1 2026 Capital Call for new investments"
                      : "e.g., Q4 2025 Distribution - realized gains"
                  }
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Across {selectedInvestors.size} investors
                </div>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    Investors
                  </div>
                  <div className="text-2xl font-bold">{selectedInvestors.size}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    Total Amount
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(getTotalAmount())}</div>
                </div>
              </div>

              {actionType === "CAPITAL_CALL" && dueDate && (
                <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">
                    {new Date(dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {purpose && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Purpose</div>
                  <div>{purpose}</div>
                </div>
              )}

              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(selectedInvestors).map((id) => {
                      const investor = investors.find((i) => i.id === id);
                      if (!investor) return null;
                      return (
                        <TableRow key={id}>
                          <TableCell>
                            {investor.entityName || investor.name || investor.email}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(calculateAmount(investor))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-800">Confirm Action</div>
                  <div className="text-sm text-yellow-700">
                    This will create {selectedInvestors.size}{" "}
                    {actionType === "CAPITAL_CALL" ? "capital call" : "distribution"}{" "}
                    transactions. Investors will be notified via email.
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <div className="text-lg font-medium">Processing transactions...</div>
                <div className="text-muted-foreground">
                  Please wait while we process each investor
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center gap-6 text-sm">
                <span className="text-green-600">
                  <CheckCircle2 className="h-4 w-4 inline mr-1" />
                  {results.success} successful
                </span>
                {results.failed > 0 && (
                  <span className="text-red-600">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {results.failed} failed
                  </span>
                )}
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-green-100 rounded-full mb-4">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-lg font-medium">Bulk Action Complete</div>
                <div className="text-muted-foreground">
                  {results.success} transactions processed successfully
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{results.success}</div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                {results.failed > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-700">{results.failed}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          {step === "complete" ? (
            <Button
              onClick={() => {
                handleClose();
                onComplete();
              }}
              className="ml-auto"
            >
              Done
            </Button>
          ) : step === "processing" ? (
            <div></div>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={step === "type" ? handleClose : prevStep}
              >
                {step === "type" ? "Cancel" : (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </>
                )}
              </Button>

              {step === "review" ? (
                <Button onClick={handleProcess} disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Confirm & Process
                </Button>
              ) : (
                <Button onClick={nextStep} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
