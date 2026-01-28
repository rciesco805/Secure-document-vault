import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Hash,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface PricingTier {
  id: string;
  tranche: number;
  pricePerUnit: string;
  unitsAvailable: number;
  unitsTotal: number;
  isActive: boolean;
}

interface FundData {
  id: string;
  name: string;
  flatModeEnabled: boolean;
  minimumInvestment: string;
  pricingTiers: PricingTier[];
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string | null;
  fund: FundData | null;
  onSubscribe: (data: {
    units?: number;
    amount: number;
    tierId?: string;
  }) => Promise<void>;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  entityName,
  fund,
  onSubscribe,
}: SubscriptionModalProps) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [units, setUnits] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTier = fund?.pricingTiers?.find(
    (t) => t.isActive && t.unitsAvailable > 0
  );
  const pricePerUnit = activeTier ? parseFloat(activeTier.pricePerUnit) : 0;
  const isFlat = fund?.flatModeEnabled || false;
  const minimumInvestment = fund ? parseFloat(fund.minimumInvestment) : 0;

  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setUnits("");
      setAmount("");
      setError(null);
    }
  }, [isOpen]);

  const sortedTiers = useMemo(() => {
    return (fund?.pricingTiers || [])
      .filter((t) => t.isActive && t.unitsAvailable > 0)
      .sort((a, b) => a.tranche - b.tranche);
  }, [fund?.pricingTiers]);

  const totalAvailableUnits = sortedTiers.reduce((sum, t) => sum + t.unitsAvailable, 0);

  const computeBlendedAmount = (numUnits: number): number => {
    let remaining = numUnits;
    let total = 0;
    for (const tier of sortedTiers) {
      if (remaining <= 0) break;
      const fromTier = Math.min(remaining, tier.unitsAvailable);
      total += fromTier * parseFloat(tier.pricePerUnit.toString());
      remaining -= fromTier;
    }
    return total;
  };

  useEffect(() => {
    if (!isFlat && units) {
      const numUnits = parseInt(units, 10);
      if (!isNaN(numUnits) && numUnits > 0) {
        const blendedAmount = computeBlendedAmount(numUnits);
        setAmount(blendedAmount.toFixed(2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, isFlat, sortedTiers]);

  const handleContinue = () => {
    setError(null);
    const numAmount = parseFloat(amount);
    const numUnits = parseInt(units, 10);

    if (isFlat) {
      if (!numAmount || isNaN(numAmount) || numAmount < minimumInvestment) {
        setError(`Minimum investment is $${minimumInvestment.toLocaleString()}`);
        return;
      }
    } else {
      if (!fund?.pricingTiers?.length || totalAvailableUnits === 0) {
        setError("No units available for subscription at this time");
        return;
      }
      if (!numUnits || isNaN(numUnits) || numUnits < 1) {
        setError("Please enter at least 1 unit");
        return;
      }
      if (numUnits > totalAvailableUnits) {
        setError(`Only ${totalAvailableUnits.toLocaleString()} units available across all tiers`);
        return;
      }
      if (isNaN(numAmount) || numAmount < minimumInvestment) {
        setError(`Minimum investment is $${minimumInvestment.toLocaleString()}`);
        return;
      }
    }

    setStep("review");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubscribe({
        units: isFlat ? undefined : parseInt(units, 10),
        amount: parseFloat(amount),
        tierId: isFlat ? undefined : activeTier?.id,
      });
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
      setStep("input");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  if (!fund) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            {step === "input" ? "Subscribe to Fund" : "Review Your Subscription"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === "input"
              ? `Subscribe to ${fund.name}`
              : "Please review your subscription details before signing"}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Entity Name</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-white">{entityName || "Individual Investor"}</span>
              </div>
            </div>

            {!isFlat && activeTier && (
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200 text-sm">Current Tier {activeTier.tranche}</span>
                  <span className="text-blue-400 font-medium">
                    {formatCurrency(pricePerUnit)} / unit
                  </span>
                </div>
                <div className="text-blue-200/60 text-xs mt-1">
                  {activeTier.unitsAvailable.toLocaleString()} units remaining
                </div>
              </div>
            )}

            {isFlat ? (
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">
                  Investment Amount
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white pl-10"
                    min={minimumInvestment}
                    step="1000"
                  />
                </div>
                <p className="text-gray-500 text-xs">
                  Minimum investment: {formatCurrency(minimumInvestment)}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="units" className="text-gray-300">
                    Number of Units
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="units"
                      type="number"
                      placeholder="Enter units"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white pl-10"
                      min={1}
                      max={activeTier?.unitsAvailable}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Total Amount</Label>
                  <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <span className="text-2xl font-bold text-emerald-400">
                      {amount ? formatCurrency(parseFloat(amount)) : "$0"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-lg border border-red-700/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 py-4">
            <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-400">Entity</span>
                <span className="text-white font-medium">{entityName || "Individual"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fund</span>
                <span className="text-white font-medium">{fund.name}</span>
              </div>
              {!isFlat && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Units</span>
                    <span className="text-white font-medium">{parseInt(units, 10).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {parseInt(units, 10) > (activeTier?.unitsAvailable || 0) ? "Blended Price per Unit" : "Price per Unit"}
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(parseFloat(amount) / parseInt(units, 10) || 0)}
                    </span>
                  </div>
                  {parseInt(units, 10) > (activeTier?.unitsAvailable || 0) && sortedTiers.length > 1 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Spans multiple pricing tiers
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-300 font-medium">Total Investment</span>
                <span className="text-emerald-400 font-bold text-lg">
                  {formatCurrency(parseFloat(amount))}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-700/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
                <p className="text-amber-200 text-sm">
                  By proceeding, you agree to sign a subscription agreement for the amount shown above.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-lg border border-red-700/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "input" ? (
            <>
              <Button variant="ghost" onClick={onClose} className="text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Continue to Review
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep("input")}
                disabled={isSubmitting}
                className="text-gray-400"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Sign Subscription
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
