import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  Eye,
  FileSignature,
  FileText,
  Clock,
  Search,
  Activity,
  MapPin,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "view" | "signature" | "document" | "note";
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    documentName?: string;
    pageCount?: number;
    duration?: number;
    status?: string;
    ipAddress?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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

const getEventColor = (type: string) => {
  switch (type) {
    case "view":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "signature":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "document":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

export function ActivityTimeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useSWR<{ events: TimelineEvent[]; total: number }>(
    `/api/lp/timeline${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const handleSearch = () => {
    setDebouncedSearch(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white flex items-center text-base sm:text-lg">
              <Activity className="h-5 w-5 mr-2 text-cyan-500" />
              Activity Timeline
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Your recent interactions and documents
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-8 bg-gray-700/50 border-gray-600 text-white text-sm h-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSearch}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 h-9"
            >
              Search
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : !data?.events?.length ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-10 w-10 mx-auto mb-2 text-gray-600" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {data.events.slice(0, 10).map((event, index) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/30 transition-colors"
              >
                <div
                  className={`p-2 rounded-lg border ${getEventColor(event.type)} flex-shrink-0`}
                >
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {event.title}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(event.timestamp)}
                    </span>
                    {event.metadata?.duration && event.metadata.duration > 0 && (
                      <span>{formatDuration(event.metadata.duration)} spent</span>
                    )}
                    {event.metadata?.pageCount && event.metadata.pageCount > 0 && (
                      <span>{event.metadata.pageCount} pages</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
