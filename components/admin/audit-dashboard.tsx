import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  Download,
  Search,
  Filter,
  FileText,
  Eye,
  PenTool,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  event: string;
  documentId: string;
  documentTitle?: string;
  recipientEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface AuditDashboardProps {
  teamId: string;
}

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "document.created", label: "Document Created" },
  { value: "document.sent", label: "Document Sent" },
  { value: "document.viewed", label: "Document Viewed" },
  { value: "document.downloaded", label: "Document Downloaded" },
  { value: "recipient.signed", label: "Signature Completed" },
  { value: "recipient.declined", label: "Signature Declined" },
  { value: "document.completed", label: "Document Completed" },
  { value: "document.voided", label: "Document Voided" },
  { value: "document.expired", label: "Document Expired" },
  { value: "reminder.sent", label: "Reminder Sent" },
];

const getEventIcon = (event: string) => {
  switch (event) {
    case "document.created":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "document.sent":
      return <PenTool className="h-4 w-4 text-purple-500" />;
    case "document.viewed":
      return <Eye className="h-4 w-4 text-gray-500" />;
    case "recipient.signed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "recipient.declined":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "document.completed":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "document.voided":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "document.expired":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "reminder.sent":
      return <RefreshCw className="h-4 w-4 text-indigo-500" />;
    default:
      return <Shield className="h-4 w-4 text-gray-400" />;
  }
};

const getEventLabel = (event: string) => {
  const eventType = EVENT_TYPES.find((e) => e.value === event);
  return eventType?.label || event.replace(".", " ").replace(/_/g, " ");
};

const getEventBadgeVariant = (event: string) => {
  if (event.includes("signed") || event.includes("completed")) return "default";
  if (event.includes("declined") || event.includes("voided")) return "destructive";
  if (event.includes("viewed") || event.includes("downloaded")) return "secondary";
  return "outline";
};

export function AuditDashboard({ teamId }: AuditDashboardProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [stats, setStats] = useState({
    totalEvents: 0,
    signatures: 0,
    views: 0,
    declined: 0,
  });

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, page, eventFilter, startDate, endDate]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventFilter && eventFilter !== "all") params.append("event", eventFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(
        `/api/teams/${teamId}/signature-audit/export?${params.toString()}`
      );

      if (res.ok) {
        const data = await res.json();
        const allLogs = data.auditLogs || [];
        
        let filteredLogs = allLogs;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredLogs = allLogs.filter(
            (log: AuditLog) =>
              log.recipientEmail?.toLowerCase().includes(term) ||
              log.documentTitle?.toLowerCase().includes(term) ||
              log.ipAddress?.includes(term)
          );
        }

        const startIndex = (page - 1) * pageSize;
        const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

        setLogs(paginatedLogs);
        setTotalCount(filteredLogs.length);

        const signatures = allLogs.filter((l: AuditLog) => l.event === "recipient.signed").length;
        const views = allLogs.filter((l: AuditLog) => l.event === "document.viewed").length;
        const declined = allLogs.filter((l: AuditLog) => l.event === "recipient.declined").length;

        setStats({
          totalEvents: allLogs.length,
          signatures,
          views,
          declined,
        });
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append("format", format);
      if (eventFilter && eventFilter !== "all") params.append("event", eventFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(
        `/api/teams/${teamId}/signature-audit/export?${params.toString()}`
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === "csv" ? "audit-report.csv" : "audit-report.html";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAuditLogs();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.signatures.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.views.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Document Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.declined.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Declined</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Audit Trail
              </CardTitle>
              <CardDescription>
                SEC 506(c) compliant audit logs for all signature events
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <Printer className="h-4 w-4 mr-2" />
                  Export Report (HTML)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, document, or IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">From:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">To:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>

              <Button onClick={handleSearch} variant="secondary">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit events found</p>
                <p className="text-sm">Events will appear here once documents are signed</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Device</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEventIcon(log.event)}
                              <Badge variant={getEventBadgeVariant(log.event)}>
                                {getEventLabel(log.event)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.documentTitle || log.documentId.slice(0, 8)}
                          </TableCell>
                          <TableCell>{log.recipientEmail || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ipAddress || "—"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {log.browser && log.os
                                ? `${log.browser} / ${log.os}`
                                : log.device || "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, totalCount)} of {totalCount} events
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">SEC 506(c) Compliance Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                This audit trail maintains records of all electronic signature events including
                IP addresses, timestamps, user agents, and device information. These records are
                required for &quot;reasonable steps&quot; verification of accredited investor status under
                SEC Rule 506(c). Audit logs are retained for 7 years per regulatory requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
