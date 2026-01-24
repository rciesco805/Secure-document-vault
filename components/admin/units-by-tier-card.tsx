import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Hash,
  DollarSign,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface PricingTier {
  id: string;
  tranche: number;
  pricePerUnit: string;
  unitsAvailable: number;
  unitsTotal: number;
  isActive: boolean;
  subscriptionCount: number;
}

interface UnitsByTierCardProps {
  fundId: string;
  teamId: string;
}

export function UnitsByTierCard({ fundId, teamId }: UnitsByTierCardProps) {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [flatModeEnabled, setFlatModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTier, setNewTier] = useState({
    tranche: "",
    pricePerUnit: "",
    unitsTotal: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTiers = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/admin/funds/${fundId}/pricing-tiers`);
      if (res.ok) {
        const data = await res.json();
        setTiers(data.tiers);
        setFlatModeEnabled(data.flatModeEnabled);
      }
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fundId]);

  useEffect(() => {
    fetchTiers();
    const interval = setInterval(() => fetchTiers(true), 30000);
    return () => clearInterval(interval);
  }, [fetchTiers]);

  const handleToggleFlatMode = async (enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/funds/${fundId}/pricing-tiers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatModeEnabled: enabled }),
      });

      if (res.ok) {
        setFlatModeEnabled(enabled);
        toast.success(enabled ? "Flat mode enabled" : "Unit-based pricing enabled");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update mode");
      }
    } catch (error) {
      toast.error("Failed to update mode");
    }
  };

  const handleAddTier = async () => {
    if (!newTier.tranche || !newTier.pricePerUnit || !newTier.unitsTotal) {
      toast.error("All fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/funds/${fundId}/pricing-tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTier),
      });

      if (res.ok) {
        toast.success("Tier added successfully");
        setNewTier({ tranche: "", pricePerUnit: "", unitsTotal: "" });
        setShowAddForm(false);
        fetchTiers();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to add tier");
      }
    } catch (error) {
      toast.error("Failed to add tier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;

    try {
      const res = await fetch(`/api/admin/funds/${fundId}/pricing-tiers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });

      if (res.ok) {
        toast.success("Tier deleted");
        fetchTiers();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to delete tier");
      }
    } catch (error) {
      toast.error("Failed to delete tier");
    }
  };

  const formatCurrency = (val: string | number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(typeof val === "string" ? parseFloat(val) : val);

  const totalUnits = tiers.reduce((sum, t) => sum + t.unitsTotal, 0);
  const availableUnits = tiers.reduce((sum, t) => sum + t.unitsAvailable, 0);
  const soldUnits = totalUnits - availableUnits;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">Units by Tier</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTiers()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription className="text-gray-400">
          Manage pricing tiers and unit availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <Label className="text-gray-300">Flat Mode (Dollar Amount Only)</Label>
          </div>
          <Switch
            checked={flatModeEnabled}
            onCheckedChange={handleToggleFlatMode}
          />
        </div>

        {flatModeEnabled ? (
          <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-700/50">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Flat mode is enabled. Investors will enter dollar amounts directly without unit selection.
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">
                  {totalUnits.toLocaleString()}
                </div>
                <div className="text-gray-400 text-xs">Total Units</div>
              </div>
              <div className="p-3 bg-emerald-900/20 rounded-lg text-center border border-emerald-700/50">
                <div className="text-2xl font-bold text-emerald-400">
                  {availableUnits.toLocaleString()}
                </div>
                <div className="text-emerald-200/70 text-xs">Available</div>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg text-center border border-blue-700/50">
                <div className="text-2xl font-bold text-blue-400">
                  {soldUnits.toLocaleString()}
                </div>
                <div className="text-blue-200/70 text-xs">Sold</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm font-medium">Pricing Tiers</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tier
                </Button>
              </div>

              {showAddForm && (
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-gray-400 text-xs">Tranche #</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newTier.tranche}
                        onChange={(e) =>
                          setNewTier({ ...newTier, tranche: e.target.value })
                        }
                        className="bg-gray-700 border-gray-600 text-white h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Price/Unit</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={newTier.pricePerUnit}
                        onChange={(e) =>
                          setNewTier({ ...newTier, pricePerUnit: e.target.value })
                        }
                        className="bg-gray-700 border-gray-600 text-white h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Total Units</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={newTier.unitsTotal}
                        onChange={(e) =>
                          setNewTier({ ...newTier, unitsTotal: e.target.value })
                        }
                        className="bg-gray-700 border-gray-600 text-white h-8"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddTier}
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Add Tier
                    </Button>
                  </div>
                </div>
              )}

              {tiers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 bg-gray-800/50 rounded-lg">
                  No pricing tiers configured. Add a tier to enable unit-based subscriptions.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Tier</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Price</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Available</th>
                        <th className="px-3 py-2 text-center text-gray-400 font-medium">Status</th>
                        <th className="px-3 py-2 text-center text-gray-400 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {tiers.map((tier) => {
                        const usedPercent =
                          ((tier.unitsTotal - tier.unitsAvailable) / tier.unitsTotal) * 100;
                        return (
                          <tr key={tier.id} className="bg-gray-900 hover:bg-gray-800/50">
                            <td className="px-3 py-2">
                              <span className="font-medium text-white">Tier {tier.tranche}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-white">
                              {formatCurrency(tier.pricePerUnit)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${100 - usedPercent}%` }}
                                  />
                                </div>
                                <span className="text-white">
                                  {tier.unitsAvailable.toLocaleString()}
                                </span>
                                <span className="text-gray-500">/ {tier.unitsTotal.toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {tier.isActive ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-gray-500 text-xs">
                                  {tier.unitsAvailable === 0 ? "Sold Out" : "Inactive"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTier(tier.id)}
                                disabled={tier.subscriptionCount > 0}
                                className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
