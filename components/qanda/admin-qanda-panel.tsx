import { useState } from "react";
import { MessageSquare, MessageCircleQuestion, Send, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useViewerNotes, useDataroomQuestions } from "@/lib/swr/use-qanda";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AdminQandAPanelProps {
  dataroomId?: string;
  linkId?: string;
}

export function AdminQandAPanel({ dataroomId, linkId }: AdminQandAPanelProps) {
  return (
    <Tabs defaultValue="questions" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="questions" className="flex items-center gap-1">
          <MessageCircleQuestion className="h-4 w-4" />
          Questions
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          Notes
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="questions" className="mt-4">
        <QuestionsTab dataroomId={dataroomId} linkId={linkId} />
      </TabsContent>
      
      <TabsContent value="notes" className="mt-4">
        <NotesTab dataroomId={dataroomId} linkId={linkId} />
      </TabsContent>
    </Tabs>
  );
}

function QuestionsTab({ dataroomId, linkId }: { dataroomId?: string; linkId?: string }) {
  const { questions, loading, replyToQuestion, updateQuestionStatus } = useDataroomQuestions({
    dataroomId,
    linkId,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleReply = async (questionId: string) => {
    if (!replyContent.trim()) return;
    
    try {
      await replyToQuestion(questionId, replyContent.trim());
      toast.success("Reply sent successfully");
      setReplyContent("");
      setReplyingTo(null);
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  const handleStatusChange = async (questionId: string, status: "OPEN" | "ANSWERED" | "CLOSED") => {
    try {
      await updateQuestionStatus(questionId, status);
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading questions...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircleQuestion className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No questions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <div key={question.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {question.viewerName || question.viewerEmail}
                </span>
                <StatusBadge status={question.status} />
                {question.pageNumber && (
                  <Badge variant="outline" className="text-xs">
                    Page {question.pageNumber}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
            >
              {expandedId === question.id ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="mt-2 text-sm">{question.content}</p>

          {expandedId === question.id && (
            <div className="mt-4 space-y-3">
              {question.messages.length > 0 && (
                <div className="space-y-2 border-l-2 border-muted pl-4">
                  {question.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`text-sm ${
                        message.senderType === "ADMIN" ? "bg-primary/5" : "bg-muted"
                      } rounded p-2`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs">
                          {message.senderName || message.senderEmail}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {message.senderType === "ADMIN" ? "Admin" : "Viewer"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === question.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleReply(question.id)}>
                      <Send className="h-4 w-4 mr-1" />
                      Send Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setReplyingTo(question.id)}>
                    <Mail className="h-4 w-4 mr-1" />
                    Reply
                  </Button>
                  {question.status !== "CLOSED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(question.id, "CLOSED")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Close
                    </Button>
                  )}
                  {question.status === "CLOSED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(question.id, "OPEN")}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Reopen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NotesTab({ dataroomId, linkId }: { dataroomId?: string; linkId?: string }) {
  const { notes, loading } = useViewerNotes({ dataroomId, linkId });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading notes...</div>;
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No notes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {note.viewerName || note.viewerEmail || "Anonymous"}
            </span>
            {note.pageNumber && (
              <Badge variant="outline" className="text-xs">
                Page {note.pageNumber}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
          </p>
          <p className="text-sm">{note.content}</p>
          {note.document && (
            <p className="text-xs text-muted-foreground mt-2">
              Document: {note.document.name}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "OPEN" | "ANSWERED" | "CLOSED" }) {
  const config = {
    OPEN: { label: "Open", variant: "default" as const, icon: Clock },
    ANSWERED: { label: "Answered", variant: "secondary" as const, icon: CheckCircle },
    CLOSED: { label: "Closed", variant: "outline" as const, icon: XCircle },
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant} className="text-xs">
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
