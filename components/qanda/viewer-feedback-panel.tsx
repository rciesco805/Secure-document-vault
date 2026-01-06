import { useState } from "react";
import { MessageSquare, MessageCircleQuestion, Send, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ViewerFeedbackPanelProps {
  viewId: string;
  documentId?: string;
  dataroomId?: string;
  linkId?: string;
  currentPage?: number;
  viewerEmail?: string;
  viewerName?: string;
  enableNotes?: boolean;
  enableQuestions?: boolean;
}

export function ViewerFeedbackPanel({
  viewId,
  documentId,
  dataroomId,
  linkId,
  currentPage,
  viewerEmail,
  viewerName,
  enableNotes = true,
  enableQuestions = true,
}: ViewerFeedbackPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"note" | "question">("note");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!enableNotes && !enableQuestions) {
    return null;
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter your message");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = activeTab === "note" ? "/api/viewer/notes" : "/api/viewer/questions";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewId,
          content: content.trim(),
          documentId,
          dataroomId,
          linkId,
          pageNumber: currentPage,
          viewerEmail,
          viewerName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      toast.success(
        activeTab === "note"
          ? "Your note has been submitted"
          : "Your question has been submitted. We'll respond via email."
      );
      setContent("");
      setIsExpanded(false);
    } catch (error) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          className="rounded-full h-12 w-12 p-0 shadow-lg"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      ) : (
        <div className="bg-background border rounded-lg shadow-xl w-80">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-medium text-sm">Feedback</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {(enableNotes && enableQuestions) && (
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("note")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "note"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Leave a Note
              </button>
              <button
                onClick={() => setActiveTab("question")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "question"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircleQuestion className="h-4 w-4 inline mr-1" />
                Ask a Question
              </button>
            </div>
          )}

          <div className="p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {activeTab === "note"
                ? "Share your feedback or thoughts about this document."
                : "Ask a private question. We'll respond via email."}
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                activeTab === "note"
                  ? "Write your note here..."
                  : "Type your question here..."
              }
              className="min-h-[80px] text-sm resize-none"
            />
            {currentPage && (
              <p className="text-xs text-muted-foreground mt-1">
                Page {currentPage}
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="w-full mt-2"
              size="sm"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
