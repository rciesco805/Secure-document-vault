import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  DollarSign,
  FileText,
  CheckCircle2,
  Wallet,
  ArrowDownRight,
  AlertTriangle,
  Activity,
  HelpCircle,
} from "lucide-react";

interface SummaryData {
  totalCommitment: number;
  totalFunded: number;
  totalDistributions: number;
  activeFunds: number;
  pendingCapitalCallsCount: number;
  pendingCapitalCallsTotal: number;
}

interface DashboardSummaryProps {
  summary: SummaryData;
  documentsCount: number;
  ndaSigned: boolean;
  accreditationStatus: string;
  formatCurrency: (amount: number) => string;
  lastUpdated?: string;
}

function MetricTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className="inline-flex items-center gap-1 cursor-help"
          role="term"
          tabIndex={0}
          aria-label={`${children}: ${content}`}
        >
          {children}
          <HelpCircle className="h-3 w-3 text-gray-500 hover:text-gray-400 transition-colors" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-xs bg-gray-800 border-gray-700 text-gray-200 text-xs"
        role="tooltip"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function DashboardSummary({
  summary,
  documentsCount,
  ndaSigned,
  accreditationStatus,
  formatCurrency,
  lastUpdated,
}: DashboardSummaryProps) {
  const fundedPercentage = summary.totalCommitment > 0
    ? Math.round((summary.totalFunded / summary.totalCommitment) * 100)
    : 0;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-900/30 to-gray-800/50 border-emerald-700/30 card-hover-lift animate-fade-in-up stagger-1">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardDescription className="text-emerald-300/70 flex items-center text-xs sm:text-sm">
              <Wallet className="h-4 w-4 mr-2 text-emerald-400" />
              <MetricTooltip content="The total amount you've pledged to invest across all funds. This is your maximum potential investment.">
                Total Commitment
              </MetricTooltip>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {summary.totalCommitment > 0 ? formatCurrency(summary.totalCommitment) : "—"}
            </div>
            <p className="text-emerald-400/60 text-xs mt-1">
              {summary.activeFunds} active fund{summary.activeFunds !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-gray-800/50 border-blue-700/30 card-hover-lift animate-fade-in-up stagger-2">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardDescription className="text-blue-300/70 flex items-center text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-2 text-blue-400" />
              <MetricTooltip content="The amount you've actually transferred to the fund through capital calls. This is your paid-in capital.">
                Capital Funded
              </MetricTooltip>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {summary.totalFunded > 0 ? formatCurrency(summary.totalFunded) : "—"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-400 h-1.5 rounded-full progress-bar-animated"
                  style={{ width: `${fundedPercentage}%` }}
                />
              </div>
              <span className="text-blue-400/60 text-xs">{fundedPercentage}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-gray-800/50 border-purple-700/30 card-hover-lift animate-fade-in-up stagger-3">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardDescription className="text-purple-300/70 flex items-center text-xs sm:text-sm">
              <ArrowDownRight className="h-4 w-4 mr-2 text-purple-400" />
              <MetricTooltip content="Money returned to you from the fund, including profits and return of capital. This is cash you've received back.">
                Distributions
              </MetricTooltip>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {summary.totalDistributions > 0 ? formatCurrency(summary.totalDistributions) : "—"}
            </div>
            <p className="text-purple-400/60 text-xs mt-1">
              Total received
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br card-hover-lift animate-fade-in-up stagger-4 ${
          summary.pendingCapitalCallsCount > 0 
            ? "from-amber-900/30 to-gray-800/50 border-amber-700/30"
            : "from-gray-800/50 to-gray-900/50 border-gray-700/30"
        }`}>
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardDescription className={`flex items-center text-xs sm:text-sm ${
              summary.pendingCapitalCallsCount > 0 ? "text-amber-300/70" : "text-gray-400"
            }`}>
              {summary.pendingCapitalCallsCount > 0 ? (
                <AlertTriangle className="h-4 w-4 mr-2 text-amber-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2 text-gray-500" />
              )}
              <MetricTooltip content="Requests from the fund for you to transfer a portion of your commitment. These have due dates and require action.">
                Capital Calls
              </MetricTooltip>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            {summary.pendingCapitalCallsCount > 0 ? (
              <>
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {formatCurrency(summary.pendingCapitalCallsTotal)}
                </div>
                <p className="text-amber-400/60 text-xs mt-1">
                  {summary.pendingCapitalCallsCount} pending
                </p>
              </>
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-gray-400">
                  —
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  No pending calls
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-lg">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-white">{documentsCount}</div>
              <p className="text-gray-400 text-xs">Documents</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/40 border-gray-700/50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${
              ndaSigned && accreditationStatus !== "PENDING"
                ? "bg-emerald-500/20"
                : "bg-amber-500/20"
            }`}>
              {ndaSigned && accreditationStatus !== "PENDING" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Activity className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className={`text-lg sm:text-xl font-bold ${
                ndaSigned && accreditationStatus !== "PENDING"
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}>
                {ndaSigned && accreditationStatus !== "PENDING" ? "Verified" : "Pending"}
              </div>
              <p className="text-gray-400 text-xs">Accreditation</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {lastUpdated && (
        <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
