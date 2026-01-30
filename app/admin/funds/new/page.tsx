"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, DollarSign, Settings, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: 1, title: "Fund Details", description: "Basic fund information" },
  { id: 2, title: "Investment Terms", description: "Target raise and minimums" },
  { id: 3, title: "Call Configuration", description: "Capital call settings" },
  { id: 4, title: "Thresholds", description: "Threshold and staged commitments" },
  { id: 5, title: "Review", description: "Confirm and create" },
];

const FUND_STYLES = [
  { value: "TRADITIONAL", label: "Traditional" },
  { value: "STAGED_COMMITMENTS", label: "Staged Commitments" },
  { value: "EVERGREEN", label: "Evergreen" },
  { value: "VARIABLE_CALLS", label: "Variable Calls" },
];

const CALL_FREQUENCIES = [
  { value: "AS_NEEDED", label: "As Needed" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUAL", label: "Semi-Annual" },
  { value: "ANNUAL", label: "Annual" },
];

interface Team {
  id: string;
  name: string;
}

export default function NewFundWizard() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const status = sessionData?.status ?? "loading";
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [formData, setFormData] = useState({
    teamId: "",
    name: "",
    description: "",
    style: "TRADITIONAL",
    targetRaise: "",
    minimumInvestment: "",
    aumTarget: "",
    callFrequency: "AS_NEEDED",
    thresholdEnabled: false,
    thresholdAmount: "",
    stagedCommitmentsEnabled: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "authenticated") {
      fetchTeams();
    }
  }, [status]);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data || []);
        if (data?.length === 1) {
          setFormData((prev) => ({ ...prev, teamId: data[0].id }));
        }
      }
    } catch (error) {
      console.error("Failed to load teams:", error);
    } finally {
      setTeamsLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.teamId) newErrors.teamId = "Please select a team";
      if (!formData.name.trim()) newErrors.name = "Fund name is required";
    }

    if (step === 2) {
      if (!formData.targetRaise || parseFloat(formData.targetRaise) <= 0) {
        newErrors.targetRaise = "Target raise must be greater than 0";
      }
      if (!formData.minimumInvestment || parseFloat(formData.minimumInvestment) <= 0) {
        newErrors.minimumInvestment = "Minimum investment must be greater than 0";
      }
    }

    if (step === 4) {
      if (formData.thresholdEnabled && (!formData.thresholdAmount || parseFloat(formData.thresholdAmount) <= 0)) {
        newErrors.thresholdAmount = "Threshold amount is required when enabled";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/funds/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/admin/fund?created=${data.fund.id}`);
      } else {
        setErrors({ submit: data.error || "Failed to create fund" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (status === "loading" || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/fund"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Create New Fund</CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
            </CardDescription>
          </CardHeader>

          <div className="px-6 pb-4">
            <div className="flex justify-between items-center">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                        ? "bg-primary text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-12 md:w-20 h-1 mx-1 ${
                        currentStep > step.id
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Fund Details</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamId">Team</Label>
                  <Select
                    value={formData.teamId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, teamId: value }))
                    }
                  >
                    <SelectTrigger className={errors.teamId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.teamId && (
                    <p className="text-sm text-red-500">{errors.teamId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Fund Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Fund A - High Growth"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief fund description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Fund Style</Label>
                  <Select
                    value={formData.style}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, style: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUND_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Investment Terms</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetRaise">Target Raise ($)</Label>
                  <Input
                    id="targetRaise"
                    type="number"
                    placeholder="e.g., 10000000"
                    value={formData.targetRaise}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, targetRaise: e.target.value }))
                    }
                    className={errors.targetRaise ? "border-red-500" : ""}
                  />
                  {errors.targetRaise && (
                    <p className="text-sm text-red-500">{errors.targetRaise}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumInvestment">Minimum Investment ($)</Label>
                  <Input
                    id="minimumInvestment"
                    type="number"
                    placeholder="e.g., 100000"
                    value={formData.minimumInvestment}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minimumInvestment: e.target.value,
                      }))
                    }
                    className={errors.minimumInvestment ? "border-red-500" : ""}
                  />
                  {errors.minimumInvestment && (
                    <p className="text-sm text-red-500">{errors.minimumInvestment}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aumTarget">AUM Target (Optional)</Label>
                  <Input
                    id="aumTarget"
                    type="number"
                    placeholder="e.g., 50000000"
                    value={formData.aumTarget}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, aumTarget: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Long-term assets under management goal
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Call Configuration</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callFrequency">Capital Call Frequency</Label>
                  <Select
                    value={formData.callFrequency}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, callFrequency: value }))
                    }
                  >
                    <SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    How often capital calls are typically issued
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="stagedCommitments">Staged Commitments</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow investors to fund commitments in stages
                    </p>
                  </div>
                  <Switch
                    id="stagedCommitments"
                    checked={formData.stagedCommitmentsEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        stagedCommitmentsEnabled: checked,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Threshold Settings</h3>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="thresholdEnabled">Capital Call Threshold</Label>
                    <p className="text-xs text-muted-foreground">
                      Require minimum committed capital before allowing capital calls
                    </p>
                  </div>
                  <Switch
                    id="thresholdEnabled"
                    checked={formData.thresholdEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        thresholdEnabled: checked,
                        thresholdAmount: checked ? prev.thresholdAmount : "",
                      }))
                    }
                  />
                </div>

                {formData.thresholdEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="thresholdAmount">Threshold Amount ($)</Label>
                    <Input
                      id="thresholdAmount"
                      type="number"
                      placeholder="e.g., 1800000"
                      value={formData.thresholdAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          thresholdAmount: e.target.value,
                        }))
                      }
                      className={errors.thresholdAmount ? "border-red-500" : ""}
                    />
                    {errors.thresholdAmount && (
                      <p className="text-sm text-red-500">{errors.thresholdAmount}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Capital calls will be blocked until total committed capital reaches
                      this amount
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Review Your Fund</h3>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fund Name</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style</span>
                    <span className="font-medium">
                      {FUND_STYLES.find((s) => s.value === formData.style)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Raise</span>
                    <span className="font-medium">
                      {formatCurrency(formData.targetRaise)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minimum Investment</span>
                    <span className="font-medium">
                      {formatCurrency(formData.minimumInvestment)}
                    </span>
                  </div>
                  {formData.aumTarget && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AUM Target</span>
                      <span className="font-medium">
                        {formatCurrency(formData.aumTarget)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Call Frequency</span>
                    <span className="font-medium">
                      {CALL_FREQUENCIES.find((f) => f.value === formData.callFrequency)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staged Commitments</span>
                    <span className="font-medium">
                      {formData.stagedCommitmentsEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Threshold</span>
                    <span className="font-medium">
                      {formData.thresholdEnabled
                        ? formatCurrency(formData.thresholdAmount)
                        : "Disabled"}
                    </span>
                  </div>
                </div>

                {errors.submit && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                    {errors.submit}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Fund
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
