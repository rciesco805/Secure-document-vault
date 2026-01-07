import { useState, useEffect } from "react";
import { XIcon, FileTextIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import Cookies from "js-cookie";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecommendedDocument {
  id: string;
  name: string;
}

interface WelcomeModalProps {
  dataroomId: string;
  dataroomName: string;
  personalNote?: string | null;
  suggestedViewing?: string | null;
  recommendedDocs?: RecommendedDocument[];
  brandColor?: string | null;
  onDocumentClick?: (documentId: string) => void;
  onClose: () => void;
}

export default function WelcomeModal({
  dataroomId,
  dataroomName,
  personalNote,
  suggestedViewing,
  recommendedDocs,
  brandColor,
  onDocumentClick,
  onClose,
}: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  const cookieKey = `welcome_dismissed_${dataroomId}`;

  useEffect(() => {
    const dismissed = Cookies.get(cookieKey);
    if (dismissed) {
      setIsOpen(false);
      onClose();
    }
  }, [cookieKey, onClose]);

  const handleDismiss = () => {
    Cookies.set(cookieKey, "true", { expires: 30 });
    setIsOpen(false);
    onClose();
  };

  const handleDocumentClick = (docId: string) => {
    handleDismiss();
    onDocumentClick?.(docId);
  };

  const accentColor = brandColor || "#7c3aed";

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-lg border-border bg-background p-0 sm:max-w-xl">
        <div 
          className="rounded-t-lg p-6 text-white"
          style={{ backgroundColor: accentColor }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <SparklesIcon className="h-6 w-6" />
              Welcome to {dataroomName}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <ScrollArea className="max-h-[60vh] px-6 py-4">
          <div className="space-y-6">
            {personalNote && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  A Note From Us
                </h3>
                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {personalNote}
                </p>
              </div>
            )}

            {suggestedViewing && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested Viewing
                </h3>
                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {suggestedViewing}
                </p>
              </div>
            )}

            {recommendedDocs && recommendedDocs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended Documents
                </h3>
                <div className="space-y-2">
                  {recommendedDocs.map((doc, index) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDocumentClick(doc.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-accent hover:border-primary/50",
                        "group"
                      )}
                    >
                      <div 
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white text-sm font-bold"
                        style={{ backgroundColor: accentColor }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {doc.name}
                        </p>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4">
          <Button 
            onClick={handleDismiss} 
            className="w-full"
            style={{ backgroundColor: accentColor }}
          >
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
