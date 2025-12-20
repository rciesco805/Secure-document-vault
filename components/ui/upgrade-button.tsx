import React, { ButtonHTMLAttributes } from "react";

import { PlanEnum } from "@/ee/stripe/constants";

interface UpgradeButtonProps {
  text: string;
  clickedPlan: PlanEnum;
  trigger: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  highlightItem?: string[];
  onClick?: () => void;
  useModal?: boolean;
  customText?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
}

export function UpgradeButton({
  text,
  clickedPlan,
  trigger,
  variant = "default",
  size = "default",
  className,
  highlightItem,
  onClick,
  useModal = true,
  customText,
  type = "button",
  disabled,
}: UpgradeButtonProps) {
  return null;
}

export function createUpgradeButton(
  text: string,
  clickedPlan: PlanEnum,
  trigger: string,
  options?: Partial<UpgradeButtonProps>,
) {
  return function UpgradeButtonComponent(props?: Partial<UpgradeButtonProps>) {
    return (
      <UpgradeButton
        text={text}
        clickedPlan={clickedPlan}
        trigger={trigger}
        {...options}
        {...props}
      />
    );
  };
}
