"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layouts/app";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  ArrowDownToLine,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

const POLL_INTERVAL = 30000;

interface FundData {
  id: string;
  name: string;
  status: string;
  targetRaise: number;
  currentRaise: number;
  commitments: number;
  funded: number;
  distributed: number;
  investorCount: number;
  capitalCallCount: number;
  distributionCount: number;
  closingDate: string | null;
  progress: number;
}

interface TransactionData {
  id: string;
  investorId: string;
  investorName: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface TransactionSummary {
  investorId: string;
  investorName: string;
  type: string;
  totalAmount: number;
  count: number;
}

interface DashboardData {
  funds: FundData[];
  totals: {
    totalRaised: string;
    totalDistributed: string;
    totalCommitments: string;
    totalInvestors: number;
    totalFunds: number;
  };
  chartData: Array<{
    name: string;
    raised: number;
    distributed: number;
    target: number;
  }>;
  transactions: TransactionData[];
  transactionSummary: TransactionSummary[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function FundDashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [actionType, setActionType] = useState<"capital_call" | "distribution">("capital_call");
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [allocationType, setAllocationType] = useState<"equal" | "pro_rata">("pro_rata");
  const [processing, setProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const res = await fetch("/api/admin/fund-dashboard");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 403) {
          throw new Error(errorData.message || "You need GP (General Partner) access to view this dashboard. Please contact your administrator.");
        }
        throw new Error(errorData.message || "Failed to fetch dashboard");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      setLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!data) return;

    const pollInterval = setInterval(() => {
      fetchDashboard(true);
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [data, fetchDashboard]);

  async function handleBulkAction() {
    if (!selectedFund || !totalAmount) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: selectedFund,
          actionType,
          totalAmount: parseFloat(totalAmount),
          allocationType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setActionResult(result);
      setWizardStep(3);
      fetchDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  function resetWizard() {
    setWizardStep(1);
    setSelectedFund("");
    setTotalAmount("");
    setAllocationType("pro_rata");
    setActionResult(null);
    setWizardOpen(false);
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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  const pieData = data.funds.map((f) => ({
    name: f.name,
    value: f.funded,
  }));

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Fund Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Overview of all funds and investor activity
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fetchDashboard()}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Link href="/admin/funds/new">
                <Button variant="outline">Create New Fund</Button>
              </Link>
              <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setWizardOpen(true)}>
                    Bulk Action Wizard
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {wizardStep === 1 && "Select Action Type"}
                      {wizardStep === 2 && "Configure Allocation"}
                      {wizardStep === 3 && "Action Complete"}
                    </DialogTitle>
                    <DialogDescription>
                      {wizardStep === 1 && "Choose the type of bulk action to perform"}
                      {wizardStep === 2 && "Set the amount and allocation method"}
                      {wizardStep === 3 && "Your action has been processed"}
                    </DialogDescription>
                  </DialogHeader>

                  {wizardStep === 1 && (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Action Type</Label>
                        <Select
                          value={actionType}
                          onValueChange={(v) => setActionType(v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="capital_call">Capital Call</SelectItem>
                            <SelectItem value="distribution">Distribution</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Fund</Label>
                        <Select value={selectedFund} onValueChange={setSelectedFund}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a fund" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.funds.map((fund) => (
                              <SelectItem key={fund.id} value={fund.id}>
                                {fund.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Total Amount ($)</Label>
                        <Input
                          type="number"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          placeholder="Enter total amount"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Allocation Method</Label>
                        <Select
                          value={allocationType}
                          onValueChange={(v) => setAllocationType(v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pro_rata">Pro Rata (by commitment)</SelectItem>
                            <SelectItem value="equal">Equal Split</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && actionResult && (
                    <div className="py-4 space-y-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">{actionResult.message}</span>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Investor</TableHead>
                              <TableHead className="text-right">Allocation</TableHead>
                              <TableHead className="text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {actionResult.allocations?.slice(0, 5).map((a: any) => (
                              <TableRow key={a.investorId}>
                                <TableCell className="font-medium">{a.investorName}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(a.allocation)}
                                </TableCell>
                                <TableCell className="text-right">{a.percentage}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex gap-2">
                    {wizardStep === 1 && (
                      <>
                        <Button variant="outline" onClick={resetWizard}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => setWizardStep(2)}
                          disabled={!selectedFund}
                        >
                          Next
                        </Button>
                      </>
                    )}
                    {wizardStep === 2 && (
                      <>
                        <Button variant="outline" onClick={() => setWizardStep(1)}>
                          Back
                        </Button>
                        <Button
                          onClick={handleBulkAction}
                          disabled={!totalAmount || processing}
                        >
                          {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {actionType === "capital_call" ? "Create Capital Call" : "Create Distribution"}
                        </Button>
                      </>
                    )}
                    {wizardStep === 3 && (
                      <Button onClick={resetWizard}>Done</Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.totals.totalRaised)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {data.totals.totalFunds} fund{data.totals.totalFunds !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.totals.totalDistributed)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Returned to investors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Commitments</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.totals.totalCommitments)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pledged capital
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totals.totalInvestors}</div>
                <p className="text-xs text-muted-foreground">
                  Across all funds
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Raised vs Distributed</CardTitle>
                <CardDescription>Comparison across all funds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={((value: number) => formatCurrency(value)) as any}
                        labelStyle={{ color: "#000" }}
                      />
                      <Legend />
                      <Bar dataKey="raised" fill="#0088FE" name="Raised" />
                      <Bar dataKey="distributed" fill="#00C49F" name="Distributed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fund Allocation</CardTitle>
                <CardDescription>Capital distribution by fund</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={((value: number) => formatCurrency(value)) as any} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Funds</CardTitle>
              <CardDescription>Detailed breakdown of each fund</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Raised</TableHead>
                      <TableHead className="text-right">Distributed</TableHead>
                      <TableHead className="text-right">Investors</TableHead>
                      <TableHead className="hidden sm:table-cell">Progress</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.funds.map((fund) => (
                      <TableRow key={fund.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/fund/${fund.id}`)}>
                        <TableCell className="font-medium text-primary hover:underline">{fund.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              fund.status === "RAISING"
                                ? "default"
                                : fund.status === "CLOSED"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {fund.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(fund.targetRaise)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(fund.funded)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(fund.distributed)}
                        </TableCell>
                        <TableCell className="text-right">{fund.investorCount}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress value={fund.progress} className="w-20" />
                            <span className="text-sm text-muted-foreground">
                              {fund.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/fund/${fund.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Fund-Wide Transactions</CardTitle>
              <CardDescription>
                Recent transactions across all funds (anonymized for compliance)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.transactions && data.transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{tx.investorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {tx.investorId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {tx.type === "CAPITAL_CALL" ? (
                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="text-sm">
                                {tx.type === "CAPITAL_CALL" ? "Capital Call" : "Distribution"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.status === "COMPLETED"
                                  ? "default"
                                  : tx.status === "PENDING"
                                  ? "secondary"
                                  : tx.status === "FAILED"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {data.transactionSummary && data.transactionSummary.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Transaction Summary by Investor</CardTitle>
                <CardDescription>
                  Aggregated totals grouped by investor (anonymized)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Tx Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.transactionSummary.map((summary, idx) => (
                        <TableRow key={`${summary.investorId}-${summary.type}-${idx}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{summary.investorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {summary.investorId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {summary.type === "CAPITAL_CALL" ? (
                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="text-sm">
                                {summary.type === "CAPITAL_CALL" ? "Capital Call" : "Distribution"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(summary.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">{summary.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
