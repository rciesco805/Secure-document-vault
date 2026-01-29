"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Download, Check, Trash2, Loader2, WifiOff } from "lucide-react";
import {
  cacheDocumentForOffline,
  removeCachedDocument,
  isDocumentCached,
  isOfflineCacheSupported,
} from "@/lib/offline/document-cache";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SaveOfflineButtonProps {
  documentId: string;
  documentName: string;
  documentUrl: string;
  thumbnailUrl?: string;
  documentSize?: number;
  documentType?: string;
  variant?: "default" | "outline" | "ghost" | "icon";
  className?: string;
}

export function SaveOfflineButton({
  documentId,
  documentName,
  documentUrl,
  thumbnailUrl,
  documentSize,
  documentType = "document",
  variant = "outline",
  className,
}: SaveOfflineButtonProps) {
  const { data: session } = useSession();
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const userId = session?.user?.id;

  useEffect(() => {
    const checkCacheStatus = async () => {
      if (!isOfflineCacheSupported()) {
        setIsSupported(false);
        return;
      }
      const cached = await isDocumentCached(documentId, userId);
      setIsCached(cached);
    };
    checkCacheStatus();
  }, [documentId, userId]);

  if (!isSupported || !userId) {
    return null;
  }

  const handleSaveOffline = async () => {
    setIsLoading(true);
    try {
      const result = await cacheDocumentForOffline(
        {
          id: documentId,
          name: documentName,
          type: documentType,
          url: documentUrl,
          thumbnailUrl,
          size: documentSize,
        },
        userId
      );

      if (result.success) {
        setIsCached(true);
        toast.success("Document saved for offline access");
      } else {
        toast.error("Failed to save document offline", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Failed to save document offline");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOffline = async () => {
    setIsLoading(true);
    try {
      const result = await removeCachedDocument(documentId, documentUrl, userId);
      if (result.success) {
        setIsCached(false);
        toast.success("Document removed from offline storage");
      } else {
        toast.error("Failed to remove document", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Failed to remove document");
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={isCached ? handleRemoveOffline : handleSaveOffline}
            disabled={isLoading}
            className={className}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCached ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isCached ? "Remove from offline" : "Save for offline"}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isCached) {
    return (
      <Button
        variant="outline"
        onClick={handleRemoveOffline}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 mr-2" />
        )}
        Remove Offline
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={handleSaveOffline}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Save Offline
    </Button>
  );
}
