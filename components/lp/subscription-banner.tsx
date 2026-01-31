import { Button } from "@/components/ui/button";
import { X, DollarSign, PenTool, CreditCard, Building2, Loader2, CheckCircle2 } from "lucide-react";

interface SubscriptionBannerProps {
  status: "none" | "available" | "pending" | "signed" | "processing" | "completed";
  fundName?: string;
  pendingAmount?: number;
  hasBankAccount?: boolean;
  onSubscribe?: () => void;
  onSignPending?: () => void;
  onCompletePayment?: () => void;
  onConnectBank?: () => void;
  onDismiss?: () => void;
}

export function SubscriptionBanner({
  status,
  fundName,
  pendingAmount,
  hasBankAccount,
  onSubscribe,
  onSignPending,
  onCompletePayment,
  onConnectBank,
  onDismiss,
}: SubscriptionBannerProps) {
  if (status === "none") return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  if (status === "completed") {
    return (
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-emerald-900/90 to-green-900/90 border-b border-emerald-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-100 font-medium">
                  Investment Complete
                </p>
                <p className="text-emerald-200/70 text-sm">
                  {fundName && `${fundName} • `}
                  {pendingAmount && formatCurrency(pendingAmount)} successfully invested
                </p>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-2 hover:bg-emerald-800/50 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-emerald-200/70" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-purple-900/90 to-violet-900/90 border-b border-purple-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
              </div>
              <div>
                <p className="text-purple-100 font-medium">
                  Payment Processing
                </p>
                <p className="text-purple-200/70 text-sm">
                  {fundName && `${fundName} • `}
                  {pendingAmount && formatCurrency(pendingAmount)} - ACH transfer in progress (1-3 business days)
                </p>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-2 hover:bg-purple-800/50 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-purple-200/70" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "signed") {
    return (
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-blue-900/90 to-indigo-900/90 border-b border-blue-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-blue-100 font-medium">
                  Complete Your Investment
                </p>
                <p className="text-blue-200/70 text-sm">
                  {fundName && `${fundName} • `}
                  {pendingAmount && formatCurrency(pendingAmount)} subscription signed - 
                  {hasBankAccount 
                    ? " ready for payment" 
                    : " connect bank account to proceed"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasBankAccount ? (
                <Button
                  onClick={onCompletePayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Complete Payment
                </Button>
              ) : (
                <Button
                  onClick={onConnectBank}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Connect Bank Account
                </Button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-2 hover:bg-blue-800/50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-blue-200/70" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-900/90 to-orange-900/90 border-b border-amber-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <PenTool className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-100 font-medium">
                  Pending Subscription Agreement
                </p>
                <p className="text-amber-200/70 text-sm">
                  {fundName && `${fundName} • `}
                  {pendingAmount && formatCurrency(pendingAmount)} awaiting your signature
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onSignPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Sign Now
              </Button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-2 hover:bg-amber-800/50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-amber-200/70" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border-b border-emerald-700/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-100 font-medium">
                Ready to Invest?
              </p>
              <p className="text-emerald-200/70 text-sm">
                {fundName
                  ? `Subscribe to ${fundName} and begin your investment`
                  : "Subscribe to a fund and begin your investment journey"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onSubscribe}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Subscribe Now
            </Button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-2 hover:bg-emerald-800/50 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-emerald-200/70" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
