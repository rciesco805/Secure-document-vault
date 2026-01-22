"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  Briefcase,
  Users,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export type AccreditationType =
  | "INCOME"
  | "NET_WORTH"
  | "PROFESSIONAL"
  | "ENTITY"
  | "OTHER";

interface AccreditationDetails {
  incomeThreshold?: string;
  netWorthThreshold?: string;
  professionalCredential?: string;
  entityType?: string;
  description?: string;
}

interface AccreditationWizardProps {
  onComplete: (data: {
    accreditationType: AccreditationType;
    accreditationDetails: AccreditationDetails;
    confirmAccredited: boolean;
    confirmRiskAware: boolean;
    confirmDocReview: boolean;
    confirmRepresentations: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const ACCREDITATION_TYPES = [
  {
    id: "INCOME" as AccreditationType,
    title: "Income",
    description:
      "Individual income exceeding $200,000 (or $300,000 joint) in each of the prior two years with expectation of same this year",
    icon: DollarSign,
    details: [
      { value: "200k_individual", label: "$200,000+ individual income" },
      { value: "300k_joint", label: "$300,000+ joint income with spouse" },
    ],
  },
  {
    id: "NET_WORTH" as AccreditationType,
    title: "Net Worth",
    description:
      "Individual or joint net worth exceeding $1,000,000 (excluding primary residence)",
    icon: Building2,
    details: [
      { value: "1m_individual", label: "$1,000,000+ individual net worth" },
      { value: "1m_joint", label: "$1,000,000+ joint net worth" },
    ],
  },
  {
    id: "PROFESSIONAL" as AccreditationType,
    title: "Professional Credentials",
    description:
      "Holder of Series 7, 65, or 82 license, or other qualifying professional credentials",
    icon: Briefcase,
    details: [
      { value: "series_7", label: "Series 7 License" },
      { value: "series_65", label: "Series 65 License" },
      { value: "series_82", label: "Series 82 License" },
      { value: "other_credential", label: "Other qualifying credential" },
    ],
  },
  {
    id: "ENTITY" as AccreditationType,
    title: "Qualified Entity",
    description:
      "Entity with $5M+ in assets, or entity owned entirely by accredited investors",
    icon: Users,
    details: [
      { value: "5m_assets", label: "Entity with $5,000,000+ in assets" },
      {
        value: "accredited_owners",
        label: "Entity owned by accredited investors",
      },
      { value: "bank_trust", label: "Bank, trust, or insurance company" },
      { value: "investment_company", label: "Registered investment company" },
    ],
  },
];

const ACKNOWLEDGMENT_CHECKBOXES = [
  {
    id: "confirmAccredited",
    label: "I confirm that I am an accredited investor",
    description:
      "I meet at least one of the SEC's accredited investor qualifications",
    required: true,
  },
  {
    id: "confirmRiskAware",
    label: "I understand the risks of private investments",
    description:
      "Private investments are illiquid, speculative, and may result in total loss of capital",
    required: true,
  },
  {
    id: "confirmDocReview",
    label: "I have reviewed the offering documents",
    description:
      "I have read and understood the private placement memorandum and related documents",
    required: true,
  },
  {
    id: "confirmRepresentations",
    label: "My representations are true and accurate",
    description:
      "The information I have provided is complete, accurate, and not misleading",
    required: true,
  },
];

export function AccreditationWizard({
  onComplete,
  onCancel,
  isLoading = false,
}: AccreditationWizardProps) {
  const [step, setStep] = useState(1);
  const [accreditationType, setAccreditationType] =
    useState<AccreditationType | null>(null);
  const [accreditationDetail, setAccreditationDetail] = useState<string>("");
  const [confirmations, setConfirmations] = useState({
    confirmAccredited: false,
    confirmRiskAware: false,
    confirmDocReview: false,
    confirmRepresentations: false,
  });

  const allConfirmed = Object.values(confirmations).every(Boolean);
  const canProceedStep1 = accreditationType !== null;
  const canProceedStep2 = accreditationDetail !== "";
  const canComplete = allConfirmed;

  const handleConfirmationChange = (
    key: keyof typeof confirmations,
    checked: boolean
  ) => {
    setConfirmations((prev) => ({ ...prev, [key]: checked }));
  };

  const handleComplete = async () => {
    if (!accreditationType || !canComplete) return;

    const selectedType = ACCREDITATION_TYPES.find(
      (t) => t.id === accreditationType
    );
    const selectedDetail = selectedType?.details.find(
      (d) => d.value === accreditationDetail
    );

    // Map to explicit keys based on accreditation type
    const detailsMap: Record<AccreditationType, string> = {
      INCOME: "incomeThreshold",
      NET_WORTH: "netWorthThreshold",
      PROFESSIONAL: "professionalCredential",
      ENTITY: "entityType",
      OTHER: "otherDescription",
    };

    const detailKey = detailsMap[accreditationType];

    await onComplete({
      accreditationType,
      accreditationDetails: {
        [detailKey]: accreditationDetail,
        description: selectedDetail?.label,
      },
      ...confirmations,
    });
  };

  const steps = [
    { number: 1, title: "Qualification" },
    { number: 2, title: "Details" },
    { number: 3, title: "Acknowledge" },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-emerald-600" />
        </div>
        <CardTitle>Accreditation Verification</CardTitle>
        <CardDescription>
          SEC Rule 506(c) requires verification of accredited investor status
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex justify-center mb-8">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s.number
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {step > s.number ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  s.number
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 transition-colors ${
                    step > s.number
                      ? "bg-emerald-600"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              How do you qualify as an accredited investor?
            </h3>
            <RadioGroup
              value={accreditationType || ""}
              onValueChange={(value) =>
                setAccreditationType(value as AccreditationType)
              }
            >
              {ACCREDITATION_TYPES.map((type) => (
                <div
                  key={type.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    accreditationType === type.id
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => setAccreditationType(type.id)}
                >
                  <RadioGroupItem value={type.id} id={type.id} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4 text-emerald-600" />
                      <Label
                        htmlFor={type.id}
                        className="font-medium cursor-pointer"
                      >
                        {type.title}
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 2 && accreditationType && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              Please specify your qualification
            </h3>
            <RadioGroup
              value={accreditationDetail}
              onValueChange={setAccreditationDetail}
            >
              {ACCREDITATION_TYPES.find((t) => t.id === accreditationType)?.details.map(
                (detail) => (
                  <div
                    key={detail.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                      accreditationDetail === detail.value
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setAccreditationDetail(detail.value)}
                  >
                    <RadioGroupItem value={detail.value} id={detail.value} />
                    <Label
                      htmlFor={detail.value}
                      className="font-medium cursor-pointer"
                    >
                      {detail.label}
                    </Label>
                  </div>
                )
              )}
            </RadioGroup>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  SEC 506(c) Compliance Notice
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  By checking the boxes below, you are making legally binding
                  representations under SEC regulations. False statements may
                  result in civil or criminal penalties.
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">
              Please acknowledge the following:
            </h3>

            <div className="space-y-4">
              {ACKNOWLEDGMENT_CHECKBOXES.map((checkbox) => (
                <div
                  key={checkbox.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                    confirmations[checkbox.id as keyof typeof confirmations]
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <Checkbox
                    id={checkbox.id}
                    checked={
                      confirmations[checkbox.id as keyof typeof confirmations]
                    }
                    onCheckedChange={(checked) =>
                      handleConfirmationChange(
                        checkbox.id as keyof typeof confirmations,
                        checked as boolean
                      )
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={checkbox.id}
                      className="font-medium cursor-pointer"
                    >
                      {checkbox.label}
                      {checkbox.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">
                      {checkbox.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onCancel?.();
            }}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canComplete || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Complete Verification
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
