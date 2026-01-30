"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Info, CheckCircle, AlertTriangle, Target, DollarSign } from "lucide-react";

interface Fund {
  id: string;
  name: string;
}

interface FundSettings {
  initialThresholdEnabled: boolean;
  initialThresholdAmount: number | null;
  fullAuthorizedAmount: number | null;
  totalCommitted: number;
  totalInbound: number;
  totalOutbound: number;
  initialThresholdMet: boolean;
  fullAuthorizedProgress: number;
  // Legacy fields
  thresholdEnabled: boolean;
  thresholdAmount: number | null;
}

export default function FundSettingsPage() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status ?? "loading";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [settings, setSettings] = useState<FundSettings>({
    initialThresholdEnabled: false,
    initialThresholdAmount: null,
    fullAuthorizedAmount: null,
    totalCommitted: 0,
    totalInbound: 0,
    totalOutbound: 0,
    initialThresholdMet: false,
    fullAuthorizedProgress: 0,
    thresholdEnabled: false,
    thresholdAmount: null,
  });
  const [initialAmountInput, setInitialAmountInput] = useState("");
  const [fullAmountInput, setFullAmountInput] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchFunds();
    }
  }, [status]);

  useEffect(() => {
    if (selectedFundId) {
      fetchSettings(selectedFundId);
    }
  }, [selectedFundId]);

  const fetchFunds = async () => {
    try {
      const res = await fetch("/api/fund-settings/funds");
      if (res.ok) {
        const data = await res.json();
        setFunds(data.funds || []);
        if (data.funds?.length > 0) {
          setSelectedFundId(data.funds[0].id);
        }
      }
    } catch (error) {
      toast.error("Failed to load funds");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async (fundId: string) => {
    try {
      const res = await fetch(`/api/fund-settings/${fundId}`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          initialThresholdEnabled: data.initialThresholdEnabled ?? data.thresholdEnabled ?? false,
          initialThresholdAmount: data.initialThresholdAmount ?? data.thresholdAmount ?? null,
          fullAuthorizedAmount: data.fullAuthorizedAmount ?? null,
          totalCommitted: data.totalCommitted ?? 0,
          totalInbound: data.totalInbound ?? 0,
          totalOutbound: data.totalOutbound ?? 0,
          initialThresholdMet: data.initialThresholdMet ?? false,
          fullAuthorizedProgress: data.fullAuthorizedProgress ?? 0,
          thresholdEnabled: data.thresholdEnabled ?? false,
          thresholdAmount: data.thresholdAmount ?? null,
        });
        setInitialAmountInput((data.initialThresholdAmount ?? data.thresholdAmount)?.toString() || "");
        setFullAmountInput(data.fullAuthorizedAmount?.toString() || "");
      }
    } catch (error) {
      toast.error("Failed to load settings");
    }
  };

  const handleSave = async () => {
    if (settings.initialThresholdEnabled && (!initialAmountInput || parseFloat(initialAmountInput) <= 0)) {
      toast.error("Initial closing threshold must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/fund-settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: selectedFundId,
          initialThresholdEnabled: settings.initialThresholdEnabled,
          initialThresholdAmount: settings.initialThresholdEnabled ? parseFloat(initialAmountInput) : null,
          fullAuthorizedAmount: fullAmountInput ? parseFloat(fullAmountInput) : null,
          // Legacy fields for backward compatibility
          thresholdEnabled: settings.initialThresholdEnabled,
          thresholdAmount: settings.initialThresholdEnabled ? parseFloat(initialAmountInput) : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save");
      }

      toast.success("Settings saved successfully");
      fetchSettings(selectedFundId);
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to access this page.</p>
      </div>
    );
  }

  const initialThresholdProgress = settings.initialThresholdAmount
    ? Math.min(100, Math.round((settings.totalCommitted / settings.initialThresholdAmount) * 100))
    : 0;

  const fullAuthorizedProgress = settings.fullAuthorizedAmount
    ? Math.min(100, Math.round((settings.totalCommitted / settings.fullAuthorizedAmount) * 100))
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Fund Threshold Settings</CardTitle>
          <CardDescription>
            Configure initial closing threshold and full authorized amount for your funds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {funds.length > 1 && (
            <div className="space-y-2">
              <Label>Select Fund</Label>
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {funds.length === 1 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{funds[0]?.name}</p>
            </div>
          )}

          <div className="space-y-6">
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Initial Closing Threshold</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  <span className="flex items-start gap-2 mt-1">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                    <span>
                      The minimum committed capital required before the first capital call. 
                      This gates capital calls until the threshold is met.
                    </span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Initial Threshold</Label>
                    <p className="text-sm text-muted-foreground">
                      Block capital calls until threshold is reached
                    </p>
                  </div>
                  <Switch
                    checked={settings.initialThresholdEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, initialThresholdEnabled: checked })
                    }
                  />
                </div>

                {settings.initialThresholdEnabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="initialAmount">Initial Threshold Amount ($)</Label>
                      <Input
                        id="initialAmount"
                        type="number"
                        min="0"
                        step="10000"
                        placeholder="e.g., 1800000 for $1.8M"
                        value={initialAmountInput}
                        onChange={(e) => setInitialAmountInput(e.target.value)}
                        className="text-lg"
                      />
                    </div>

                    {settings.initialThresholdAmount && (
                      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Progress to Initial Threshold</span>
                          <span className="font-medium">{initialThresholdProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              initialThresholdProgress >= 100 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(100, initialThresholdProgress)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Committed: ${settings.totalCommitted.toLocaleString()}</span>
                          <span>Threshold: ${settings.initialThresholdAmount.toLocaleString()}</span>
                        </div>
                        {initialThresholdProgress >= 100 ? (
                          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle className="h-4 w-4" />
                            Initial threshold met - capital calls enabled
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            ${(settings.initialThresholdAmount - settings.totalCommitted).toLocaleString()} more needed before first capital call
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-base">Full Authorized Amount</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  <span className="flex items-start gap-2 mt-1">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                    <span>
                      The total authorized raise target (e.g., $9.55M). 
                      This is for progress tracking only and does not gate any actions.
                    </span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullAmount">Full Authorized Amount ($)</Label>
                  <Input
                    id="fullAmount"
                    type="number"
                    min="0"
                    step="100000"
                    placeholder="e.g., 9550000 for $9.55M"
                    value={fullAmountInput}
                    onChange={(e) => setFullAmountInput(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {fullAmountInput && parseFloat(fullAmountInput) > 0 && (
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress to Full Authorization</span>
                      <span className="font-medium">{fullAuthorizedProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all bg-purple-500"
                        style={{ width: `${Math.min(100, fullAuthorizedProgress)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Committed: ${settings.totalCommitted.toLocaleString()}</span>
                      <span>Target: ${parseFloat(fullAmountInput).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${(parseFloat(fullAmountInput) - settings.totalCommitted).toLocaleString()} remaining to reach full authorization
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Current Fund Aggregates</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">${settings.totalCommitted.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Committed</p>
                </div>
                <div>
                  <p className="text-lg font-bold">${settings.totalInbound.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Inbound</p>
                </div>
                <div>
                  <p className="text-lg font-bold">${settings.totalOutbound.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Outbound</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
