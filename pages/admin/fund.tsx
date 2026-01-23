import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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
} from "lucide-react";

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
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function FundDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [actionType, setActionType] = useState<"capital_call" | "distribution">("capital_call");
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [allocationType, setAllocationType] = useState<"equal" | "pro_rata">("pro_rata");
  const [processing, setProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/admin/fund-dashboard");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch dashboard");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const pieData = data.funds.map((f) => ({
    name: f.name,
    value: f.funded,
  }));

  return (
    <>
      <Head>
        <title>Fund Dashboard | GP Admin</title>
      </Head>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Fund Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Overview of all funds and investor activity
              </p>
            </div>

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
                        formatter={(value: number) => formatCurrency(value)}
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
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.funds.map((fund) => (
                      <TableRow key={fund.id}>
                        <TableCell className="font-medium">{fund.name}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
