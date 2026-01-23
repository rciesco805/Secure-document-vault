import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface FundConfig {
  id: string;
  name: string;
  ndaGateEnabled: boolean;
  capitalCallThresholdEnabled: boolean;
  capitalCallThreshold: number | null;
  callFrequency: string;
  stagedCommitmentsEnabled: boolean;
  currentRaise: number;
  targetRaise: number;
}

interface FundConfigFormProps {
  fund: FundConfig;
  onUpdate: (updatedFund: FundConfig) => void;
}

const CALL_FREQUENCIES = [
  { value: "AS_NEEDED", label: "As Needed" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUAL", label: "Semi-Annual" },
  { value: "ANNUAL", label: "Annual" },
];

export function FundConfigForm({ fund, onUpdate }: FundConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    ndaGateEnabled: fund.ndaGateEnabled,
    capitalCallThresholdEnabled: fund.capitalCallThresholdEnabled,
    capitalCallThreshold: fund.capitalCallThreshold?.toString() || "",
    callFrequency: fund.callFrequency,
    stagedCommitmentsEnabled: fund.stagedCommitmentsEnabled,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/funds/${fund.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ndaGateEnabled: config.ndaGateEnabled,
          capitalCallThresholdEnabled: config.capitalCallThresholdEnabled,
          capitalCallThreshold: config.capitalCallThreshold
            ? parseFloat(config.capitalCallThreshold)
            : null,
          callFrequency: config.callFrequency,
          stagedCommitmentsEnabled: config.stagedCommitmentsEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update settings");
      }

      const data = await response.json();
      toast.success("Fund settings updated");
      onUpdate({
        ...fund,
        ndaGateEnabled: config.ndaGateEnabled,
        capitalCallThresholdEnabled: config.capitalCallThresholdEnabled,
        capitalCallThreshold: config.capitalCallThreshold
          ? parseFloat(config.capitalCallThreshold)
          : null,
        callFrequency: config.callFrequency,
        stagedCommitmentsEnabled: config.stagedCommitmentsEnabled,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const thresholdProgress = fund.capitalCallThreshold
    ? Math.min(100, Math.round((fund.currentRaise / fund.capitalCallThreshold) * 100))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fund.name}</CardTitle>
        <CardDescription>
          Configure fund settings and capital call thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>NDA Gate</Label>
            <p className="text-sm text-muted-foreground">
              Require investors to sign NDA before accessing documents
            </p>
          </div>
          <Switch
            checked={config.ndaGateEnabled}
            onCheckedChange={(checked) =>
              setConfig({ ...config, ndaGateEnabled: checked })
            }
          />
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label>Capital Call Threshold</Label>
              <p className="text-sm text-muted-foreground">
                Require minimum committed capital before allowing capital calls
              </p>
            </div>
            <Switch
              checked={config.capitalCallThresholdEnabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, capitalCallThresholdEnabled: checked })
              }
            />
          </div>

          {config.capitalCallThresholdEnabled && (
            <div className="ml-0 space-y-4">
              <div>
                <Label htmlFor="threshold">Minimum Threshold Amount ($)</Label>
                <Input
                  id="threshold"
                  type="number"
                  placeholder="e.g., 1800000"
                  value={config.capitalCallThreshold}
                  onChange={(e) =>
                    setConfig({ ...config, capitalCallThreshold: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {fund.capitalCallThreshold && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress to Threshold</span>
                    <span>{thresholdProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        thresholdProgress >= 100
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(100, thresholdProgress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>${fund.currentRaise.toLocaleString()}</span>
                    <span>${fund.capitalCallThreshold.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <Label>Call Frequency</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Default schedule for capital calls
          </p>
          <Select
            value={config.callFrequency}
            onValueChange={(value) =>
              setConfig({ ...config, callFrequency: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALL_FREQUENCIES.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Staged Commitments</Label>
              <p className="text-sm text-muted-foreground">
                Allow investors to commit capital in stages
              </p>
            </div>
            <Switch
              checked={config.stagedCommitmentsEnabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, stagedCommitmentsEnabled: checked })
              }
            />
          </div>
        </div>

        <div className="border-t pt-6 flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
