import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  ArrowDownToLine,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Target,
  Calendar,
} from "lucide-react";

interface FundDetails {
  id: string;
  name: string;
  description: string | null;
  style: string | null;
  status: string;
  targetRaise: number;
  currentRaise: number;
  minimumInvestment: number;
  aumTarget: number | null;
  callFrequency: string;
  capitalCallThresholdEnabled: boolean;
  capitalCallThreshold: number | null;
  stagedCommitmentsEnabled: boolean;
  closingDate: string | null;
  createdAt: string;
  aggregate: {
    totalInbound: number;
    totalOutbound: number;
    totalCommitted: number;
    thresholdEnabled: boolean;
    thresholdAmount: number | null;
  } | null;
  investors: Array<{
    id: string;
    name: string;
    email: string;
    commitment: number;
    funded: number;
    status: string;
  }>;
  capitalCalls: Array<{
    id: string;
    callNumber: number;
    amount: number;
    dueDate: string;
    status: string;
  }>;
  distributions: Array<{
    id: string;
    distributionNumber: number;
    totalAmount: number;
    distributionDate: string;
    status: string;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const CALL_FREQUENCY_LABELS: Record<string, string> = {
  AS_NEEDED: "As Needed",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-Annual",
  ANNUAL: "Annual",
};

const STYLE_LABELS: Record<string, string> = {
  TRADITIONAL: "Traditional",
  STAGED_COMMITMENTS: "Staged Commitments",
  EVERGREEN: "Evergreen",
  VARIABLE_CALLS: "Variable Calls",
};

export default function FundDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [fund, setFund] = useState<FundDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchFundDetails();
    }
  }, [id]);

  async function fetchFundDetails() {
    try {
      const res = await fetch(`/api/admin/fund/${id}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          throw new Error("Fund not found");
        }
        throw new Error("Failed to fetch fund details");
      }
      const json = await res.json();
      setFund(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number | string) {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Link href="/admin/fund">
          <Button>Back to Funds</Button>
        </Link>
      </div>
    );
  }

  if (!fund) return null;

  const thresholdMet = fund.aggregate
    ? fund.aggregate.totalCommitted >= (fund.aggregate.thresholdAmount || 0)
    : false;

  const thresholdProgress = fund.aggregate?.thresholdAmount
    ? Math.min(100, (fund.aggregate.totalCommitted / fund.aggregate.thresholdAmount) * 100)
    : 0;

  const targetProgress = fund.targetRaise > 0
    ? Math.min(100, (fund.currentRaise / fund.targetRaise) * 100)
    : 0;

  const aumProgress = fund.aumTarget && fund.aumTarget > 0
    ? Math.min(100, (fund.currentRaise / fund.aumTarget) * 100)
    : 0;

  const investorChartData = fund.investors.slice(0, 10).map((inv) => ({
    name: inv.name.split(" ")[0],
    commitment: inv.commitment,
    funded: inv.funded,
  }));

  const flowData = [
    { name: "Committed", value: fund.aggregate?.totalCommitted || 0 },
    { name: "Inbound", value: fund.aggregate?.totalInbound || 0 },
    { name: "Outbound", value: fund.aggregate?.totalOutbound || 0 },
  ];

  return (
    <>
      <Head>
        <title>{fund.name} | Fund Dashboard</title>
      </Head>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <Link
                href="/admin/fund"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to All Funds
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold">{fund.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={fund.status === "RAISING" ? "default" : "secondary"}>
                  {fund.status}
                </Badge>
                {fund.style && (
                  <Badge variant="outline">
                    {STYLE_LABELS[fund.style] || fund.style}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Calls: {CALL_FREQUENCY_LABELS[fund.callFrequency] || fund.callFrequency}
                </span>
              </div>
            </div>
            <Link href={`/admin/settings/fund?id=${fund.id}`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>

          {fund.aggregate?.thresholdEnabled && (
            <Card className={`mb-6 ${thresholdMet ? "border-green-500" : "border-amber-500"}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  {thresholdMet ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${thresholdMet ? "text-green-700" : "text-amber-700"}`}>
                      {thresholdMet
                        ? "Capital Call Threshold Met - Calls Enabled"
                        : "Capital Call Threshold Not Met - Calls Blocked"}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Progress value={thresholdProgress} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatCurrency(fund.aggregate?.totalCommitted || 0)} /{" "}
                        {formatCurrency(fund.aggregate?.thresholdAmount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Target Raise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(fund.targetRaise)}</p>
                <Progress value={targetProgress} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {targetProgress.toFixed(1)}% of target
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Current Raise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(fund.currentRaise)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Min: {formatCurrency(fund.minimumInvestment)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Committed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(fund.aggregate?.totalCommitted || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From {fund.investors.length} investor{fund.investors.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Investors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fund.investors.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fund.capitalCalls.length} calls, {fund.distributions.length} distributions
                </p>
              </CardContent>
            </Card>
          </div>

          {fund.aumTarget && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">AUM Progress</CardTitle>
                <CardDescription>
                  Progress toward {formatCurrency(fund.aumTarget)} AUM target
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { name: "Current", value: fund.currentRaise },
                        { name: "Target", value: fund.aumTarget },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <Progress value={aumProgress} className="mt-4 h-3" />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {aumProgress.toFixed(1)}% toward AUM target
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capital Flow</CardTitle>
                <CardDescription>Committed vs Inbound vs Outbound</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Investors</CardTitle>
                <CardDescription>By commitment amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={investorChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="commitment" fill="#0088FE" name="Commitment" />
                      <Bar dataKey="funded" fill="#00C49F" name="Funded" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Capital Calls</CardTitle>
              </CardHeader>
              <CardContent>
                {fund.capitalCalls.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No capital calls yet</p>
                ) : (
                  <div className="space-y-3">
                    {fund.capitalCalls.slice(0, 5).map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">Call #{call.callNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(call.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(call.amount)}</p>
                          <Badge
                            variant={call.status === "COMPLETED" ? "default" : "secondary"}
                          >
                            {call.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Distributions</CardTitle>
              </CardHeader>
              <CardContent>
                {fund.distributions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No distributions yet</p>
                ) : (
                  <div className="space-y-3">
                    {fund.distributions.slice(0, 5).map((dist) => (
                      <div
                        key={dist.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">Distribution #{dist.distributionNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(dist.distributionDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(dist.totalAmount)}</p>
                          <Badge
                            variant={dist.status === "COMPLETED" ? "default" : "secondary"}
                          >
                            {dist.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Fund Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Style</p>
                  <p className="font-medium">{STYLE_LABELS[fund.style || ""] || fund.style || "Not Set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Call Frequency</p>
                  <p className="font-medium">
                    {CALL_FREQUENCY_LABELS[fund.callFrequency] || fund.callFrequency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Threshold</p>
                  <p className="font-medium">
                    {fund.capitalCallThresholdEnabled
                      ? formatCurrency(fund.capitalCallThreshold || 0)
                      : "Disabled"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staged Commitments</p>
                  <p className="font-medium">
                    {fund.stagedCommitmentsEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              {fund.closingDate && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Closing Date: {new Date(fund.closingDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
