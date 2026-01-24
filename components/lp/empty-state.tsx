import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, TrendingUp, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: "folder" | "chart";
  actionLabel?: string;
  onAction?: () => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export function EmptyState({
  title = "No data yet",
  description = "There's nothing to show here at the moment.",
  icon = "folder",
  actionLabel,
  onAction,
  showRefresh = false,
  onRefresh,
}: EmptyStateProps) {
  const IconComponent = icon === "chart" ? TrendingUp : FolderOpen;

  return (
    <Card className="bg-gray-800/30 border-gray-700/50">
      <CardContent className="py-12 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
          <IconComponent className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
          {description}
        </p>
        <div className="flex items-center justify-center gap-3">
          {showRefresh && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          {actionLabel && onAction && (
            <Button
              size="sm"
              onClick={onAction}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
