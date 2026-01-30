"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";

import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useTeam } from "@/context/team-context";
import useDatarooms from "@/lib/swr/use-datarooms";

export default function QuickAddPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmail = searchParams?.get("email");

  const [selectedDataroom, setSelectedDataroom] = useState<string>("");
  const [emails, setEmails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingInvites, setSendingInvites] = useState<boolean>(false);

  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { datarooms, loading: dataroomsLoading } = useDatarooms();

  useEffect(() => {
    if (queryEmail && typeof queryEmail === "string") {
      setEmails(decodeURIComponent(queryEmail));
    }
  }, [queryEmail]);

  useEffect(() => {
    if (datarooms && datarooms.length === 1 && !selectedDataroom) {
      setSelectedDataroom(datarooms[0].id);
    }
  }, [datarooms, selectedDataroom]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!teamId) {
      toast.error("Team not loaded. Please refresh the page.");
      return;
    }

    if (!selectedDataroom) {
      toast.error("Please select a dataroom");
      return;
    }

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
      const ensureResponse = await fetch(
        `/api/teams/${teamId}/datarooms/${selectedDataroom}/ensure-quick-add`,
        { method: "POST" }
      );
      
      if (!ensureResponse.ok) {
        console.error("Failed to ensure quick add group");
      }

      const response = await fetch(
        `/api/teams/${teamId}/datarooms/${selectedDataroom}/quick-add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: emailList }),
        }
      );

      if (!response.ok) {
        const { message } = await response.json();
        toast.error(message || "Failed to add users");
        return;
      }

      setSendingInvites(true);

      const inviteResponse = await fetch(
        `/api/teams/${teamId}/datarooms/${selectedDataroom}/quick-add/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: emailList }),
        }
      );

      if (!inviteResponse.ok) {
        toast.warning("Users added, but some invitations may not have been sent");
      } else {
        toast.success(
          `${emailList.length} user${emailList.length > 1 ? "s" : ""} added and invited!`
        );
      }

      setEmails("");
      
      router.push(`/datarooms/${selectedDataroom}`);
    } catch (error) {
      console.error("Error adding users:", error);
      toast.error("Error adding users. Please try again.");
    } finally {
      setLoading(false);
      setSendingInvites(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Add Investor
            </CardTitle>
            <CardDescription>
              Add this investor to a dataroom with one click. They will receive a
              magic link email for instant access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="dataroom" className="text-sm font-medium">
                  Select Dataroom
                </Label>
                {dataroomsLoading || !teamId ? (
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading datarooms...
                  </div>
                ) : datarooms && datarooms.length > 0 ? (
                  <Select
                    value={selectedDataroom}
                    onValueChange={setSelectedDataroom}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Choose a dataroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {datarooms.map((dr) => (
                        <SelectItem key={dr.id} value={dr.id}>
                          {dr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      No datarooms found. You need to create a dataroom first before adding investors.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/datarooms")}
                    >
                      Go to Datarooms
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="emails" className="text-sm font-medium">
                  Investor Email
                </Label>
                <Textarea
                  id="emails"
                  placeholder="investor@example.com"
                  className="mt-1.5 min-h-[80px] resize-none"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  disabled={loading}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  You can add multiple emails (one per line or comma-separated)
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/datarooms")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !emails.trim() || !selectedDataroom}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {sendingInvites ? "Sending invite..." : "Adding user..."}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add & Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
