"use client";

import { useState } from "react";
import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import useSWR from "swr";
import { format } from "date-fns";

import AppLayout from "@/components/layouts/app";
import { SettingsHeader } from "@/components/settings/settings-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileText,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Loader2,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface AuditLogEntry {
  id: string;
  documentId: string;
  event: string;
  recipientEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
  document?: {
    title: string;
    status: string;
  };
}

interface SignatureDocument {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  recipients: {
    email: string;
    status: string;
  }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  "document.created": { label: "Created", color: "bg-gray-100 text-gray-800" },
  "document.sent": { label: "Sent", color: "bg-purple-100 text-purple-800" },
  "document.viewed": { label: "Viewed", color: "bg-blue-100 text-blue-800" },
  "recipient.signed": {
    label: "Signed",
    color: "bg-emerald-100 text-emerald-800",
  },
  "recipient.declined": { label: "Declined", color: "bg-red-100 text-red-800" },
  "document.completed": {
    label: "Completed",
    color: "bg-green-100 text-green-800",
  },
  "document.declined": { label: "Declined", color: "bg-red-100 text-red-800" },
  "document.voided": { label: "Voided", color: "bg-orange-100 text-orange-800" },
  "document.expired": { label: "Expired", color: "bg-yellow-100 text-yellow-800" },
  "document.downloaded": { label: "Downloaded", color: "bg-indigo-100 text-indigo-800" },
  "reminder.sent": { label: "Reminder Sent", color: "bg-cyan-100 text-cyan-800" },
};

export default function SignatureAuditPageClient() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const { data: documentsData, isLoading: documentsLoading } = useSWR<{
    documents: SignatureDocument[];
  }>(teamId ? `/api/teams/${teamId}/signature-documents` : null, fetcher);

  const { data: auditData, isLoading: auditLoading } = useSWR<{
    auditLogs: AuditLogEntry[];
  }>(
    teamId && selectedDocumentId
      ? `/api/teams/${teamId}/signature-documents/${selectedDocumentId}/audit-log`
      : null,
    fetcher
  );

  const handleExportCSV = async () => {
    if (!teamId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedDocumentId) params.append("documentId", selectedDocumentId);
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      params.append("format", "csv");

      const response = await fetch(
        `/api/teams/${teamId}/signature-audit/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signature-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Audit report exported successfully");
    } catch (error) {
      toast.error("Failed to export audit report");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!teamId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedDocumentId) params.append("documentId", selectedDocumentId);
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);
      params.append("format", "pdf");

      const response = await fetch(
        `/api/teams/${teamId}/signature-audit/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signature-audit-${format(new Date(), "yyyy-MM-dd")}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Audit report exported successfully");
    } catch (error) {
      toast.error("Failed to export audit report");
    } finally {
      setExporting(false);
    }
  };

  const filteredDocuments = documentsData?.documents?.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.recipients.some((r) =>
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getEventIcon = (event: string) => {
    switch (event) {
      case "document.viewed":
        return <Eye className="h-4 w-4" />;
      case "recipient.signed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "document.completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "document.declined":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout>
      <main className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <SettingsHeader />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-6 w-6 text-emerald-600" />
                Signature Audit Trail
              </h2>
              <p className="text-muted-foreground">
                SEC 506(c) compliance: Track all signature events with full
                traceability
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button onClick={handleExportPDF} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Export Report
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>
                  Filter audit logs by document or date range
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Documents</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Document</Label>
                  <Select
                    value={selectedDocumentId}
                    onValueChange={setSelectedDocumentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDocuments?.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">
                              {doc.title}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      placeholder="Start date"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      placeholder="End date"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedDocumentId("");
                    setSearchQuery("");
                    setDateRange({ start: "", end: "" });
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Audit Log</CardTitle>
                <CardDescription>
                  Complete history of signature events with IP and timestamp
                  tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedDocumentId ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a document to view its audit trail</p>
                  </div>
                ) : auditLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : auditData?.auditLogs?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit events recorded for this document</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditData?.auditLogs?.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getEventIcon(log.event)}
                                <Badge
                                  variant="secondary"
                                  className={
                                    EVENT_LABELS[log.event]?.color ||
                                    "bg-gray-100"
                                  }
                                >
                                  {EVENT_LABELS[log.event]?.label || log.event}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.recipientEmail || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {log.ipAddress || "N/A"}
                              </code>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(log.createdAt),
                                "MMM d, yyyy HH:mm:ss"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Signature Documents</CardTitle>
              <CardDescription>
                Overview of all signature documents and their compliance status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !documentsData?.documents?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No signature documents found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentsData.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {doc.title}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                doc.status === "COMPLETED"
                                  ? "default"
                                  : doc.status === "DECLINED"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.recipients.length} recipient
                            {doc.recipients.length !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell>
                            {format(new Date(doc.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {doc.completedAt
                              ? format(new Date(doc.completedAt), "MMM d, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDocumentId(doc.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Audit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
