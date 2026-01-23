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
import { Loader2 } from "lucide-react";

interface Fund {
  id: string;
  name: string;
}

interface FundSettings {
  thresholdEnabled: boolean;
  thresholdAmount: number | null;
  totalCommitted: number;
  totalInbound: number;
  totalOutbound: number;
}

export default function FundSettingsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [settings, setSettings] = useState<FundSettings>({
    thresholdEnabled: false,
    thresholdAmount: null,
    totalCommitted: 0,
    totalInbound: 0,
    totalOutbound: 0,
  });
  const [amountInput, setAmountInput] = useState("");

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
        setSettings(data);
        setAmountInput(data.thresholdAmount?.toString() || "");
      }
    } catch (error) {
      toast.error("Failed to load settings");
    }
  };

  const handleSave = async () => {
    if (settings.thresholdEnabled && (!amountInput || parseFloat(amountInput) <= 0)) {
      toast.error("Threshold amount must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/fund-settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId: selectedFundId,
          thresholdEnabled: settings.thresholdEnabled,
          thresholdAmount: settings.thresholdEnabled ? parseFloat(amountInput) : null,
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

  const thresholdProgress = settings.thresholdAmount
    ? Math.min(100, Math.round((settings.totalCommitted / settings.thresholdAmount) * 100))
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Fund Threshold Settings</CardTitle>
          <CardDescription>
            Configure capital call thresholds for your funds
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Capital Call Threshold</Label>
                <p className="text-sm text-muted-foreground">
                  Require minimum committed capital before allowing capital calls
                </p>
              </div>
              <Switch
                checked={settings.thresholdEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, thresholdEnabled: checked })
                }
              />
            </div>

            {settings.thresholdEnabled && (
              <div className="space-y-4 ml-0">
                <div className="space-y-2">
                  <Label htmlFor="amount">Threshold Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g., 1800000"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum committed capital required before capital calls
                  </p>
                </div>

                {settings.thresholdAmount && (
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress to Threshold</span>
                      <span className="font-medium">{thresholdProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          thresholdProgress >= 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(100, thresholdProgress)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Committed: ${settings.totalCommitted.toLocaleString()}</span>
                      <span>Threshold: ${settings.thresholdAmount.toLocaleString()}</span>
                    </div>
                    {thresholdProgress >= 100 ? (
                      <p className="text-sm text-green-600 font-medium">
                        Threshold met - capital calls enabled
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600">
                        ${(settings.thresholdAmount - settings.totalCommitted).toLocaleString()} more needed
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Current Aggregates</p>
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
