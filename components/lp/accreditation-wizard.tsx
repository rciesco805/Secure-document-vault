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
  Calendar,
  FileText,
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

interface FormDInfo {
  filingDate?: string;
  amendmentDue?: string;
  reminderSent?: boolean;
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
  formDInfo?: FormDInfo;
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
  formDInfo,
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
      <CardHeader className="text-center px-4 sm:px-6">
        <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 sm:mb-4">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
        </div>
        <CardTitle className="text-lg sm:text-xl">Accreditation Verification</CardTitle>
        <CardDescription className="text-sm">
          SEC Rule 506(c) requires verification of accredited investor status
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        <div className="flex justify-center mb-6 sm:mb-8">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s.number
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {step > s.number ? (
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    s.number
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-500 hidden sm:block">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 transition-colors ${
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
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
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
                  className={`flex items-start space-x-3 p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer min-h-[60px] ${
                    accreditationType === type.id
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 active:bg-gray-50"
                  }`}
                  onClick={() => setAccreditationType(type.id)}
                >
                  <RadioGroupItem value={type.id} id={type.id} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <Label
                        htmlFor={type.id}
                        className="font-medium cursor-pointer text-sm sm:text-base"
                      >
                        {type.title}
                      </Label>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 2 && accreditationType && (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
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
                    className={`flex items-center space-x-3 p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer min-h-[52px] ${
                      accreditationDetail === detail.value
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 active:bg-gray-50"
                    }`}
                    onClick={() => setAccreditationDetail(detail.value)}
                  >
                    <RadioGroupItem value={detail.value} id={detail.value} />
                    <Label
                      htmlFor={detail.value}
                      className="font-medium cursor-pointer text-sm sm:text-base"
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
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4 sm:mb-6">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200">
                  SEC 506(c) Compliance Notice
                </p>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1">
                  By checking the boxes below, you are making legally binding
                  representations under SEC regulations.
                </p>
              </div>
            </div>

            {formDInfo?.filingDate && (
              <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200">
                    SEC Form D Filing
                  </p>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Form D filed: {new Date(formDInfo.filingDate).toLocaleDateString()}
                  </p>
                  {formDInfo.amendmentDue && (
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Annual amendment due: {new Date(formDInfo.amendmentDue).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              Please acknowledge the following:
            </h3>

            <div className="space-y-3 sm:space-y-4">
              {ACKNOWLEDGMENT_CHECKBOXES.map((checkbox) => (
                <div
                  key={checkbox.id}
                  className={`flex items-start space-x-3 p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer min-h-[60px] ${
                    confirmations[checkbox.id as keyof typeof confirmations]
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700 active:bg-gray-50"
                  }`}
                  onClick={() => handleConfirmationChange(
                    checkbox.id as keyof typeof confirmations,
                    !confirmations[checkbox.id as keyof typeof confirmations]
                  )}
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
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={checkbox.id}
                      className="font-medium cursor-pointer text-sm sm:text-base leading-tight"
                    >
                      {checkbox.label}
                      {checkbox.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                      {checkbox.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onCancel?.();
            }}
            disabled={isLoading}
            className="min-h-[44px] order-2 sm:order-1"
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
              className="min-h-[44px] order-1 sm:order-2"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canComplete || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px] order-1 sm:order-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Complete Verification</span>
                  <span className="sm:hidden">Complete</span>
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
