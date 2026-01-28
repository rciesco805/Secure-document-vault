import { useState, useEffect, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TrendingUp,
  TrendingDown,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface CapitalMetrics {
  totalCommitted: number;
  totalCalled: number;
  totalFunded: number;
  totalDistributed: number;
  uncalledCapital: number;
  netPosition: number;
  fundedPercentage: number;
  investorCount: number;
  averageCommitment: number;
  byStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
}

interface InvestorCapital {
  id: string;
  name: string;
  email: string;
  entityName: string | null;
  commitment: number;
  called: number;
  funded: number;
  distributed: number;
  uncalled: number;
  fundedPct: number;
}

interface CapitalTrackingDashboardProps {
  fundId: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  COMMITTED: "bg-blue-100 text-blue-700",
  PARTIALLY_FUNDED: "bg-purple-100 text-purple-700",
  FULLY_FUNDED: "bg-green-100 text-green-700",
  DEFAULTED: "bg-red-100 text-red-700",
};

export function CapitalTrackingDashboard({ fundId }: CapitalTrackingDashboardProps) {
  const [metrics, setMetrics] = useState<CapitalMetrics | null>(null);
  const [investors, setInvestors] = useState<InvestorCapital[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("commitment");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/capital-tracking?fundId=${fundId}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setInvestors(data.investors || []);
      }
    } catch (error) {
      console.error("Failed to fetch capital tracking:", error);
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const sortedInvestors = [...investors].sort((a, b) => {
    const aVal = a[sortBy as keyof InvestorCapital] as number;
    const bVal = b[sortBy as keyof InvestorCapital] as number;
    return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
  });

  const capitalFlowData = metrics
    ? [
        { name: "Committed", value: metrics.totalCommitted, fill: "#0088FE" },
        { name: "Called", value: metrics.totalCalled, fill: "#00C49F" },
        { name: "Funded", value: metrics.totalFunded, fill: "#FFBB28" },
        { name: "Distributed", value: metrics.totalDistributed, fill: "#FF8042" },
      ]
    : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Failed to load capital data</p>
          <Button variant="outline" className="mt-4" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Capital Tracking</h2>
          <p className="text-muted-foreground">
            Committed capital, funding status, and cash flow metrics
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Committed</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalCommitted)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-700" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {metrics.investorCount} investors
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Funded</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalFunded)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowDownToLine className="h-5 w-5 text-green-700" />
              </div>
            </div>
            <div className="mt-2">
              <Progress value={metrics.fundedPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {metrics.fundedPercentage.toFixed(1)}% of committed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Distributed</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalDistributed)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ArrowUpFromLine className="h-5 w-5 text-orange-700" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Net: {formatCurrency(metrics.netPosition)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uncalled Capital</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.uncalledCapital)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-5 w-5 text-purple-700" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Avg: {formatCurrency(metrics.averageCommitment)} / investor
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Capital Flow</CardTitle>
            <CardDescription>Committed vs funded vs distributed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capitalFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={((v: number) => formatCurrency(v)) as any} />
                <Bar dataKey="value" fill="#8884d8">
                  {capitalFlowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investor Status Breakdown</CardTitle>
            <CardDescription>By commitment status</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.byStatus}
                    dataKey="amount"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {metrics.byStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={((v: number) => formatCurrency(v)) as any} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Investor Capital Details</CardTitle>
              <CardDescription>
                Individual investor commitments and funding status
              </CardDescription>
            </div>
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v);
                setSortOrder("desc");
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commitment">Commitment</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
                <SelectItem value="uncalled">Uncalled</SelectItem>
                <SelectItem value="fundedPct">Funded %</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor</TableHead>
                <TableHead className="text-right">Commitment</TableHead>
                <TableHead className="text-right">Called</TableHead>
                <TableHead className="text-right">Funded</TableHead>
                <TableHead className="text-right">Distributed</TableHead>
                <TableHead className="text-right">Uncalled</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvestors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No investors found
                  </TableCell>
                </TableRow>
              ) : (
                sortedInvestors.map((investor) => (
                  <TableRow key={investor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {investor.entityName || investor.name || "—"}
                        </div>
                        <div className="text-sm text-muted-foreground">{investor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(investor.commitment)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(investor.called)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(investor.funded)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(investor.distributed)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(investor.uncalled)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={investor.fundedPct} className="h-2 w-20" />
                        <span className="text-sm text-muted-foreground">
                          {investor.fundedPct.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
