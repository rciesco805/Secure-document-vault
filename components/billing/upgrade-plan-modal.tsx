import React from "react";

import { PlanEnum } from "@/ee/stripe/constants";

export function UpgradePlanModal({
  clickedPlan,
  trigger,
  open,
  setOpen,
  highlightItem,
  children,
}: {
  clickedPlan: PlanEnum;
  trigger?: string;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  highlightItem?: string[];
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}
