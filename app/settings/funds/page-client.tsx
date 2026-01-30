"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

import AppLayout from "@/components/layouts/app";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Building2, Shield, Users } from "lucide-react";

interface Fund {
  id: string;
  name: string;
  description: string | null;
  status: string;
  ndaGateEnabled: boolean;
  _count: {
    investments: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FundsSettingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const [updatingFunds, setUpdatingFunds] = useState<Record<string, boolean>>({});

  const { data, error, isLoading } = useSWR<{ funds: Fund[] }>(
    teamId ? `/api/teams/${teamId}/funds` : null,
    fetcher
  );

  const handleNdaGateToggle = async (fundId: string, enabled: boolean) => {
    setUpdatingFunds((prev) => ({ ...prev, [fundId]: true }));

    const promise = fetch(`/api/funds/${fundId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ndaGateEnabled: enabled }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update setting");
      }
      await mutate(`/api/teams/${teamId}/funds`);
      return res.json();
    });

    toast.promise(promise, {
      loading: "Updating NDA gate setting...",
      success: enabled ? "NDA gate enabled" : "NDA gate disabled",
      error: (err) => err.message || "Failed to update setting",
    });

    try {
      await promise;
    } finally {
      setUpdatingFunds((prev) => ({ ...prev, [fundId]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RAISING":
        return <Badge className="bg-blue-600">Raising</Badge>;
      case "CLOSED":
        return <Badge className="bg-gray-600">Closed</Badge>;
      case "DEPLOYED":
        return <Badge className="bg-emerald-600">Deployed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <main className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <SettingsHeader />

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Fund Settings</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage investor portal settings for each fund
            </p>
          </div>

          {isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              Loading funds...
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-500">
              Failed to load funds
            </div>
          )}

          {data?.funds && data.funds.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No funds created yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a fund to manage investor portal settings
                </p>
              </CardContent>
            </Card>
          )}

          {data?.funds && data.funds.length > 0 && (
            <div className="space-y-4">
              {data.funds.map((fund) => (
                <Card key={fund.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{fund.name}</CardTitle>
                          {fund.description && (
                            <CardDescription className="mt-1">
                              {fund.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(fund.status)}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {fund._count.investments} investors
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-amber-500" />
                        <div>
                          <Label htmlFor={`nda-gate-${fund.id}`} className="font-medium cursor-pointer">
                            NDA Gate Required
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Require investors to sign NDA and acknowledge accreditation before accessing the portal
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`nda-gate-${fund.id}`}
                        checked={fund.ndaGateEnabled}
                        onCheckedChange={(checked) => handleNdaGateToggle(fund.id, checked)}
                        disabled={updatingFunds[fund.id]}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
