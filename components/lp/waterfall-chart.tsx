import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDown, DollarSign, TrendingUp, Users } from "lucide-react";

interface WaterfallTier {
  name: string;
  type: "return_of_capital" | "preferred_return" | "catch_up" | "carried_interest" | "profit_split";
  percentage: number;
  lpShare: number;
  gpShare: number;
  amount?: number;
  threshold?: number;
  description: string;
}

interface WaterfallChartProps {
  totalProceeds: number;
  capitalContributed: number;
  preferredReturn?: number;
  carriedInterest?: number;
  catchUpPercentage?: number;
  tiers?: WaterfallTier[];
  className?: string;
}

const DEFAULT_TIERS: WaterfallTier[] = [
  {
    name: "Return of Capital",
    type: "return_of_capital",
    percentage: 100,
    lpShare: 100,
    gpShare: 0,
    description: "LPs receive 100% until all contributed capital is returned",
  },
  {
    name: "Preferred Return (8%)",
    type: "preferred_return",
    percentage: 100,
    lpShare: 100,
    gpShare: 0,
    threshold: 8,
    description: "LPs receive 8% annual preferred return on contributed capital",
  },
  {
    name: "GP Catch-Up",
    type: "catch_up",
    percentage: 100,
    lpShare: 0,
    gpShare: 100,
    description: "GP receives 100% until receiving 20% of total profits",
  },
  {
    name: "Carried Interest (80/20)",
    type: "carried_interest",
    percentage: 100,
    lpShare: 80,
    gpShare: 20,
    description: "Remaining profits split 80% LP / 20% GP",
  },
];

export function WaterfallChart({
  totalProceeds,
  capitalContributed,
  preferredReturn = 8,
  carriedInterest = 20,
  catchUpPercentage = 100,
  tiers = DEFAULT_TIERS,
  className = "",
}: WaterfallChartProps) {
  const calculations = useMemo(() => {
    let remainingProceeds = totalProceeds;
    const results: Array<{
      tier: WaterfallTier;
      amount: number;
      lpAmount: number;
      gpAmount: number;
      cumulative: number;
    }> = [];

    let cumulativeLP = 0;
    let cumulativeGP = 0;

    const prefReturnAmount = capitalContributed * (preferredReturn / 100);

    for (const tier of tiers) {
      let tierAmount = 0;

      if (tier.type === "return_of_capital") {
        tierAmount = Math.min(remainingProceeds, capitalContributed);
      } else if (tier.type === "preferred_return") {
        tierAmount = Math.min(remainingProceeds, prefReturnAmount);
      } else if (tier.type === "catch_up") {
        const targetGP = (cumulativeLP + remainingProceeds) * (carriedInterest / 100);
        tierAmount = Math.min(remainingProceeds, Math.max(0, targetGP - cumulativeGP));
      } else {
        tierAmount = remainingProceeds;
      }

      const lpAmount = tierAmount * (tier.lpShare / 100);
      const gpAmount = tierAmount * (tier.gpShare / 100);

      cumulativeLP += lpAmount;
      cumulativeGP += gpAmount;

      results.push({
        tier,
        amount: tierAmount,
        lpAmount,
        gpAmount,
        cumulative: cumulativeLP + cumulativeGP,
      });

      remainingProceeds -= tierAmount;

      if (remainingProceeds <= 0) break;
    }

    return {
      tiers: results,
      totalLP: cumulativeLP,
      totalGP: cumulativeGP,
      profitMultiple: capitalContributed > 0 ? cumulativeLP / capitalContributed : 0,
    };
  }, [totalProceeds, capitalContributed, preferredReturn, carriedInterest, tiers]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const getBarColor = (type: WaterfallTier["type"]) => {
    switch (type) {
      case "return_of_capital":
        return "bg-blue-500";
      case "preferred_return":
        return "bg-green-500";
      case "catch_up":
        return "bg-amber-500";
      case "carried_interest":
      case "profit_split":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const maxAmount = Math.max(...calculations.tiers.map((t) => t.amount), 1);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Distribution Waterfall
        </CardTitle>
        <CardDescription>
          Capital stack priority and profit distribution structure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Proceeds</p>
            <p className="text-2xl font-bold">{formatCurrency(totalProceeds)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> LP Total
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(calculations.totalLP)}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">GP Total</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(calculations.totalGP)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <TooltipProvider>
            {calculations.tiers.map((result, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{result.tier.name}</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">
                          {result.tier.lpShare}/{result.tier.gpShare}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{result.tier.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(result.amount)}</span>
                </div>

                <div className="flex gap-1 h-8">
                  {result.lpAmount > 0 && (
                    <div
                      className="bg-blue-500 rounded-l flex items-center justify-center text-white text-xs font-medium transition-all"
                      style={{
                        width: `${(result.lpAmount / result.amount) * 100}%`,
                        minWidth: result.lpAmount > 0 ? "40px" : "0",
                      }}
                    >
                      LP: {formatCurrency(result.lpAmount)}
                    </div>
                  )}
                  {result.gpAmount > 0 && (
                    <div
                      className="bg-amber-500 rounded-r flex items-center justify-center text-white text-xs font-medium transition-all"
                      style={{
                        width: `${(result.gpAmount / result.amount) * 100}%`,
                        minWidth: result.gpAmount > 0 ? "40px" : "0",
                      }}
                    >
                      GP: {formatCurrency(result.gpAmount)}
                    </div>
                  )}
                </div>

                {index < calculations.tiers.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </TooltipProvider>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">LP Multiple</p>
              <p className="text-xl font-bold">
                {calculations.profitMultiple.toFixed(2)}x
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">LP Share of Profits</p>
              <p className="text-xl font-bold">
                {totalProceeds > 0
                  ? ((calculations.totalLP / totalProceeds) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Waterfall Structure</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Preferred Return: {preferredReturn}%</div>
            <div>Carried Interest: {carriedInterest}%</div>
            <div>Capital Contributed: {formatCurrency(capitalContributed)}</div>
            <div>Catch-up: {catchUpPercentage}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WaterfallChart;
