"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import useSWR from "swr";
import { useTeam } from "@/context/team-context";
import AppLayout from "@/components/layouts/app";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  Eye,
  FileSignature,
  FileText,
  Clock,
  Search,
  Activity,
  Download,
  MapPin,
  Globe,
  Filter,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "view" | "signature" | "document" | "note";
  title: string;
  description: string;
  timestamp: string;
  investorEmail?: string;
  investorName?: string;
  metadata?: {
    documentName?: string;
    pageCount?: number;
    duration?: number;
    status?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
};

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getEventIcon = (type: string) => {
  switch (type) {
    case "view":
      return <Eye className="h-4 w-4" />;
    case "signature":
      return <FileSignature className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getEventBadge = (type: string) => {
  switch (type) {
    case "view":
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">View</Badge>;
    case "signature":
      return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Signature</Badge>;
    case "document":
      return <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Document</Badge>;
    default:
      return <Badge variant="secondary">Event</Badge>;
  }
};

export default function InvestorTimelinePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useSWR<{ events: TimelineEvent[]; total: number }>(
    teamId 
      ? `/api/teams/${teamId}/investor-timeline${appliedSearch ? `?search=${encodeURIComponent(appliedSearch)}` : ""}`
      : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleSearch = () => {
    setAppliedSearch(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleExportCSV = async () => {
    if (!teamId) return;
    setIsExporting(true);
    try {
      const url = `/api/teams/${teamId}/investor-timeline?format=csv${appliedSearch ? `&search=${encodeURIComponent(appliedSearch)}` : ""}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `investor-timeline-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:m-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Investor Timeline</h1>
          <p className="text-muted-foreground">
            Track all investor interactions for SEC 506(c) compliance
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  CRM Activity Log
                </CardTitle>
                <CardDescription>
                  Complete audit trail of investor visits and signatures
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" onClick={handleSearch}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleExportCSV}
                  disabled={isExporting || !data?.events?.length}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "SEC Export (CSV)"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Failed to load timeline data
              </div>
            ) : !data?.events?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No investor activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-4">
                  Showing {data.events.length} of {data.total} events
                </div>
                <div className="border rounded-lg divide-y">
                  {data.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{event.title}</span>
                          {getEventBadge(event.type)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(event.timestamp)}
                          </span>
                          {event.investorEmail && (
                            <span className="font-mono">{event.investorEmail}</span>
                          )}
                          {event.metadata?.country && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {event.metadata.city && `${event.metadata.city}, `}{event.metadata.country}
                            </span>
                          )}
                          {event.metadata?.ipAddress && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.metadata.ipAddress}
                            </span>
                          )}
                          {event.metadata?.duration && event.metadata.duration > 0 && (
                            <span>{formatDuration(event.metadata.duration)} spent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
