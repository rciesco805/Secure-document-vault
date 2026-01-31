"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ManualInvestment {
  id: string;
  fundId: string;
  fundName: string;
  documentType: string;
  documentTitle: string;
  documentNumber: string | null;
  commitmentAmount: string;
  fundedAmount: string;
  unfundedAmount: string;
  units: string | null;
  shares: string | null;
  pricePerUnit: string | null;
  ownershipPercent: string | null;
  signedDate: string;
  effectiveDate: string | null;
  fundedDate: string | null;
  transferStatus: string;
  isVerified: boolean;
  notes: string | null;
}

interface Summary {
  count: number;
  totalCommitment: string;
  totalFunded: string;
  totalUnfunded: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION_AGREEMENT: "Subscription",
  SIDE_LETTER: "Side Letter",
  AMENDMENT: "Amendment",
  TRANSFER: "Transfer",
  OTHER: "Other",
};

const TRANSFER_STATUS_ICONS: Record<string, any> = {
  PENDING: { icon: Clock, className: "text-yellow-500" },
  PROCESSING: { icon: Loader2, className: "text-blue-500 animate-spin" },
  COMPLETED: { icon: CheckCircle, className: "text-green-500" },
  FAILED: { icon: AlertCircle, className: "text-red-500" },
};

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function ManualInvestmentsCard() {
  const [investments, setInvestments] = useState<ManualInvestment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvestments() {
      try {
        const response = await fetch("/api/lp/manual-investments");
        if (response.ok) {
          const data = await response.json();
          setInvestments(data.investments || []);
          setSummary(data.summary || null);
        }
      } catch (error) {
        console.error("Failed to fetch manual investments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInvestments();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Off-Platform Investments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (investments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Off-Platform Investments
        </CardTitle>
        <CardDescription>
          Documents and investments recorded outside the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Commitment</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(summary.totalCommitment)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Funded</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(summary.totalFunded)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Unfunded</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(summary.totalUnfunded)}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {investments.map((inv) => {
            const statusConfig = TRANSFER_STATUS_ICONS[inv.transferStatus] || TRANSFER_STATUS_ICONS.PENDING;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={inv.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{inv.documentTitle}</h4>
                      <Badge variant="outline" className="text-xs">
                        {DOCUMENT_TYPE_LABELS[inv.documentType] || inv.documentType}
                      </Badge>
                      {inv.isVerified && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>Verified by Admin</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {inv.fundName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Signed {format(new Date(inv.signedDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(inv.commitmentAmount)}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <StatusIcon className={`h-3 w-3 ${statusConfig.className}`} />
                      <span className="capitalize">
                        {inv.transferStatus.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {(inv.units || inv.shares || inv.ownershipPercent) && (
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    {inv.units && <span>Units: {parseFloat(inv.units).toLocaleString()}</span>}
                    {inv.shares && <span>Shares: {parseFloat(inv.shares).toLocaleString()}</span>}
                    {inv.ownershipPercent && <span>Ownership: {inv.ownershipPercent}%</span>}
                    {inv.pricePerUnit && <span>Price/Unit: {formatCurrency(inv.pricePerUnit)}</span>}
                  </div>
                )}

                {inv.notes && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    {inv.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
