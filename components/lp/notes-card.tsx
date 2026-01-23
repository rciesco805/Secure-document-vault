import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  User,
  Building2,
  Clock,
} from "lucide-react";

interface Note {
  id: string;
  content: string;
  isFromInvestor: boolean;
  teamName: string;
  createdAt: string;
}

interface NotesCardProps {
  notes: Note[];
  onSendNote: (content: string) => Promise<boolean>;
}

export function NotesCard({ notes, onSendNote }: NotesCardProps) {
  const [noteContent, setNoteContent] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteSent, setNoteSent] = useState(false);

  const handleSend = async () => {
    if (!noteContent.trim()) return;

    setNoteSending(true);
    try {
      const success = await onSendNote(noteContent);
      if (success) {
        setNoteContent("");
        setNoteSent(true);
        setTimeout(() => setNoteSent(false), 3000);
      }
    } finally {
      setNoteSending(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
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

  return (
    <Card className="bg-gray-800/50 border-gray-700 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-500" />
          Communication
        </CardTitle>
        <CardDescription className="text-gray-400">
          Messages between you and the fund manager
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 mb-4 max-h-[300px] overflow-y-auto space-y-3">
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-600 text-xs mt-1">Start a conversation with your fund manager</p>
            </div>
          ) : (
            notes.slice(0, 10).map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg ${
                  note.isFromInvestor
                    ? "bg-emerald-500/10 border border-emerald-500/20 ml-4"
                    : "bg-gray-700/50 mr-4"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {note.isFromInvestor ? (
                    <User className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className={`text-xs font-medium ${
                    note.isFromInvestor ? "text-emerald-400" : "text-blue-400"
                  }`}>
                    {note.isFromInvestor ? "You" : note.teamName}
                  </span>
                  <span className="text-gray-600 text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(note.createdAt)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{note.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-700/50 pt-4">
          {noteSent ? (
            <div className="flex items-center justify-center p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2" />
              <span className="text-emerald-300">Message sent successfully!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Type your message here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 min-h-[80px] text-sm resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!noteContent.trim() || noteSending}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {noteSending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
