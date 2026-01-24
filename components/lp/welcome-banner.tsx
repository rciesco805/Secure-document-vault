import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  X,
  FileSignature,
  ShieldCheck,
  CreditCard,
  FileText,
} from "lucide-react";

interface WelcomeBannerProps {
  investorName: string;
  ndaSigned: boolean;
  accreditationStatus: string;
  hasBankLink: boolean;
  hasInvestments: boolean;
  onDismiss?: () => void;
  onStartNda?: () => void;
  onStartAccreditation?: () => void;
  onConnectBank?: () => void;
}

interface Step {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

export function WelcomeBanner({
  investorName,
  ndaSigned,
  accreditationStatus,
  hasBankLink,
  hasInvestments,
  onDismiss,
  onStartNda,
  onStartAccreditation,
  onConnectBank,
}: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const accreditationComplete = accreditationStatus !== "PENDING";
  
  const steps: Step[] = [
    {
      id: "nda",
      label: "Sign NDA",
      description: "Review and sign the confidentiality agreement",
      completed: ndaSigned,
      icon: <FileSignature className="h-4 w-4" />,
      action: ndaSigned ? undefined : onStartNda,
      actionLabel: "Sign Now",
    },
    {
      id: "accreditation",
      label: "Verify Accreditation",
      description: "Confirm your accredited investor status",
      completed: accreditationComplete,
      icon: <ShieldCheck className="h-4 w-4" />,
      action: accreditationComplete ? undefined : onStartAccreditation,
      actionLabel: "Verify",
    },
    {
      id: "bank",
      label: "Connect Bank",
      description: "Link your account for capital transactions",
      completed: hasBankLink,
      icon: <CreditCard className="h-4 w-4" />,
      action: hasBankLink ? undefined : onConnectBank,
      actionLabel: "Connect",
    },
    {
      id: "invest",
      label: "Ready to Invest",
      description: "Browse available fund opportunities",
      completed: hasInvestments,
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const allComplete = completedSteps === steps.length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  const nextStep = steps.find((s) => !s.completed);

  if (dismissed || allComplete) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/20 border-indigo-700/40 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-2xl" />
      
      <CardContent className="p-4 sm:p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss welcome banner"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Welcome, {investorName}!
            </h2>
            <p className="text-gray-400 text-sm">
              Complete these steps to start investing
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-indigo-400 font-medium">
              {completedSteps} of {steps.length} complete
            </span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border transition-all ${
                step.completed
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : step === nextStep
                  ? "bg-indigo-500/10 border-indigo-500/30"
                  : "bg-gray-800/30 border-gray-700/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Circle className={`h-4 w-4 ${
                    step === nextStep ? "text-indigo-400" : "text-gray-500"
                  }`} />
                )}
                <span className={`text-xs font-medium ${
                  step.completed
                    ? "text-emerald-400"
                    : step === nextStep
                    ? "text-indigo-300"
                    : "text-gray-400"
                }`}>
                  Step {index + 1}
                </span>
              </div>
              <p className={`text-sm font-medium ${
                step.completed ? "text-emerald-300" : "text-white"
              }`}>
                {step.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {nextStep && nextStep.action && (
          <Button
            onClick={nextStep.action}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0"
          >
            {nextStep.icon}
            <span className="ml-2">{nextStep.actionLabel}</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
