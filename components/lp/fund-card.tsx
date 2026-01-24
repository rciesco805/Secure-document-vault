import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface FundData {
  id: string;
  name: string;
  description?: string;
  status: string;
  style?: string;
  investment: {
    commitmentAmount: number;
    fundedAmount: number;
    fundedPercentage: number;
    status: string;
    subscriptionDate: string | null;
  };
  metrics: {
    targetRaise: number;
    currentRaise: number;
    raiseProgress: number;
    totalCommitted: number;
    initialThresholdMet: boolean;
    thresholdProgress: number;
  };
  recentDistributions: Array<{
    id: string;
    number: number;
    amount: number;
    type: string;
    date: string;
    status: string;
  }>;
  recentCapitalCalls: Array<{
    id: string;
    number: number;
    amount: number;
    purpose?: string;
    dueDate: string;
    status: string;
  }>;
}

interface FundCardProps {
  fund: FundData;
  formatCurrency: (amount: number) => string;
}

export function FundCard({ fund, formatCurrency }: FundCardProps) {
  const { investment, metrics } = fund;

  return (
    <Card className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700 overflow-hidden card-hover-lift animate-fade-in-up">
      <CardHeader className="pb-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-emerald-500" />
              {fund.name}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              {fund.style || "Investment Fund"} • {fund.status}
            </CardDescription>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            metrics.initialThresholdMet 
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-amber-500/20 text-amber-400"
          }`}>
            {metrics.initialThresholdMet ? "Active" : "Raising"}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="p-3 bg-gray-700/30 rounded-lg">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Wallet className="h-3.5 w-3.5" />
              Your Commitment
            </div>
            <div className="text-white font-semibold text-lg">
              {formatCurrency(investment.commitmentAmount)}
            </div>
          </div>
          
          <div className="p-3 bg-gray-700/30 rounded-lg">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Funded
            </div>
            <div className="text-white font-semibold text-lg">
              {formatCurrency(investment.fundedAmount)}
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-400">Your Funding Progress</span>
              <span className="text-emerald-400 font-medium">{investment.fundedPercentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2 rounded-full progress-bar-animated"
                style={{ width: `${investment.fundedPercentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-400">Fund Raise Progress</span>
              <span className="text-blue-400 font-medium">{metrics.raiseProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full progress-bar-animated"
                style={{ width: `${metrics.raiseProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatCurrency(metrics.currentRaise)}</span>
              <span>{formatCurrency(metrics.targetRaise)}</span>
            </div>
          </div>
        </div>

        {fund.recentDistributions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-emerald-400" />
              Recent Distributions
            </h4>
            <div className="space-y-2">
              {fund.recentDistributions.slice(0, 2).map((dist) => (
                <div key={dist.id} className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-gray-300">Distribution #{dist.number}</span>
                  </div>
                  <span className="text-emerald-400 font-medium">{formatCurrency(dist.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {fund.recentCapitalCalls.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
              Upcoming Capital Calls
            </h4>
            <div className="space-y-2">
              {fund.recentCapitalCalls.slice(0, 2).map((call) => (
                <div key={call.id} className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <div>
                      <span className="text-sm text-gray-300">Call #{call.number}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        Due {new Date(call.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="text-amber-400 font-medium">{formatCurrency(call.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {investment.subscriptionDate && (
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              Subscribed {new Date(investment.subscriptionDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
