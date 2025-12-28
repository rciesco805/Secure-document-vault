import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { Loader2, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuickAddModal({
  open,
  setOpen,
  dataroomId,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dataroomId: string;
}) {
  const [emails, setEmails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingInvites, setSendingInvites] = useState<boolean>(false);

  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const emailList = emails
      .split(/[\n,]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));

    if (emailList.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    setLoading(true);

    try {
      await fetch(
        `/api/teams/${teamId}/datarooms/${dataroomId}/ensure-quick-add`,
        {
          method: "POST",
        },
      );

      const response = await fetch(
        `/api/teams/${teamId}/datarooms/${dataroomId}/quick-add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emails: emailList,
          }),
        },
      );

      if (!response.ok) {
        const { message } = await response.json();
        toast.error(message || "Failed to add users");
        return;
      }

      const data = await response.json();
      
      setSendingInvites(true);
      
      const inviteResponse = await fetch(
        `/api/teams/${teamId}/datarooms/${dataroomId}/quick-add/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emails: emailList,
          }),
        },
      );

      if (!inviteResponse.ok) {
        toast.warning(`Users added, but some invitations may not have been sent`);
      } else {
        toast.success(`${emailList.length} user${emailList.length > 1 ? "s" : ""} added and invited!`);
      }

      mutate(`/api/teams/${teamId}/datarooms/${dataroomId}/groups`);
      setEmails("");
      setOpen(false);
    } catch (error) {
      console.error("Error adding users:", error);
      toast.error("Error adding users. Please try again.");
    } finally {
      setLoading(false);
      setSendingInvites(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Add Users
          </DialogTitle>
          <DialogDescription>
            Add users with one-click access to this dataroom. They will receive a
            magic link email and have full access for their session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emails" className="text-sm font-medium">
                Email Addresses
              </Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses (one per line or comma-separated)&#10;example@company.com&#10;investor@fund.com"
                className="mt-1.5 min-h-[120px] resize-none"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Users will receive a magic link for instant access. No password or verification code required during their session.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !emails.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {sendingInvites ? "Sending invites..." : "Adding users..."}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add & Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
