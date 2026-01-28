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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  FileText,
  Eye,
  PenTool,
  Send,
  Search,
  Filter,
  RefreshCw,
  Download,
  User,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "view" | "signature" | "document" | "note";
  title: string;
  description: string;
  timestamp: string;
  investorEmail?: string;
  investorName?: string;
  isFromInvestor?: boolean;
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

interface InvestorNote {
  id: string;
  content: string;
  isFromInvestor: boolean;
  createdAt: string;
  investor: {
    id: string;
    entityName: string | null;
    user: { name: string | null; email: string };
  };
}

interface InvestorTimelineProps {
  teamId: string;
  investorId?: string;
  showNotes?: boolean;
  showReply?: boolean;
}

const EVENT_ICONS: Record<string, any> = {
  view: Eye,
  signature: PenTool,
  document: FileText,
  note: MessageSquare,
};

const EVENT_COLORS: Record<string, string> = {
  view: "bg-blue-100 text-blue-700",
  signature: "bg-green-100 text-green-700",
  document: "bg-purple-100 text-purple-700",
  note: "bg-orange-100 text-orange-700",
};

export function InvestorTimeline({
  teamId,
  investorId,
  showNotes = true,
  showReply = true,
}: InvestorTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<InvestorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [replyContent, setReplyContent] = useState("");
  const [replyToInvestor, setReplyToInvestor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (investorId) params.set("investorId", investorId);

      const [eventsRes, notesRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/investor-timeline?${params}`),
        showNotes
          ? fetch(`/api/admin/investor-notes?teamId=${teamId}${investorId ? `&investorId=${investorId}` : ""}`)
          : Promise.resolve(null),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }

      if (notesRes?.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, investorId, searchQuery, showNotes]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleSendReply = async () => {
    if (!replyContent.trim() || !replyToInvestor) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/investor-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: replyToInvestor,
          content: replyContent.trim(),
        }),
      });

      if (res.ok) {
        setReplyContent("");
        setReplyToInvestor(null);
        fetchTimeline();
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSending(false);
    }
  };

  const handleExportCSV = async () => {
    const params = new URLSearchParams({ format: "csv" });
    if (investorId) params.set("investorId", investorId);
    window.open(`/api/teams/${teamId}/investor-timeline?${params}`, "_blank");
  };

  const combinedTimeline = [
    ...events,
    ...notes.map((note): TimelineEvent => ({
      id: `note-${note.id}`,
      type: "note",
      title: note.isFromInvestor ? "Investor Message" : "GP Reply",
      description: note.content,
      timestamp: note.createdAt,
      investorEmail: note.investor.user.email,
      investorName: note.investor.entityName || note.investor.user.name || undefined,
      isFromInvestor: note.isFromInvestor,
      metadata: undefined,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredTimeline = combinedTimeline.filter((event) => {
    if (typeFilter !== "all" && event.type !== typeFilter) return false;
    return true;
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              CRM Timeline
            </CardTitle>
            <CardDescription>
              Investor activity, documents, and communications
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTimeline}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by investor, document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="view">Views</SelectItem>
              <SelectItem value="signature">Signatures</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="note">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activity found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTimeline.map((event) => {
              const Icon = EVENT_ICONS[event.type] || MessageSquare;
              const colorClass = EVENT_COLORS[event.type] || "bg-gray-100 text-gray-700";

              return (
                <div
                  key={event.id}
                  className={`flex gap-4 p-4 rounded-lg border ${
                    event.type === "note" && event.isFromInvestor
                      ? "bg-orange-50 border-orange-200"
                      : event.type === "note"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-muted/30"
                  }`}
                >
                  <div className={`p-2 rounded-full h-fit ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.title}</span>
                          {event.type === "note" && (
                            <Badge variant={event.isFromInvestor ? "default" : "secondary"}>
                              {event.isFromInvestor ? "From LP" : "From GP"}
                            </Badge>
                          )}
                        </div>
                        {event.investorName && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <User className="h-3 w-3" />
                            {event.investorName}
                            {event.investorEmail && ` (${event.investorEmail})`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>

                    <p className="mt-2 text-sm whitespace-pre-wrap">{event.description}</p>

                    {event.metadata && (
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {event.metadata.pageCount !== undefined && event.metadata.pageCount > 0 && (
                          <span>{event.metadata.pageCount} pages viewed</span>
                        )}
                        {event.metadata.duration !== undefined && event.metadata.duration > 0 && (
                          <span>{formatDuration(event.metadata.duration)} spent</span>
                        )}
                        {(event.metadata.city || event.metadata.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[event.metadata.city, event.metadata.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    )}

                    {showReply && event.type === "note" && event.isFromInvestor && (
                      <div className="mt-3">
                        {replyToInvestor === event.id.replace("note-", "") ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Type your reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSendReply} disabled={sending}>
                                {sending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Send className="h-4 w-4 mr-1" />
                                )}
                                Send Reply
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReplyToInvestor(null);
                                  setReplyContent("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const noteId = event.id.replace("note-", "");
                              const note = notes.find((n) => n.id === noteId);
                              if (note) {
                                setReplyToInvestor(note.investor.id);
                              }
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Reply
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
