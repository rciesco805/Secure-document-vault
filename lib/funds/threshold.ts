import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export type ThresholdCheckResult = {
  allowed: boolean;
  thresholdEnabled: boolean;
  threshold: number | null;
  currentRaise: number;
  percentComplete: number;
  message?: string;
};

export async function checkCapitalCallThreshold(
  fundId: string
): Promise<ThresholdCheckResult> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: {
      capitalCallThresholdEnabled: true,
      capitalCallThreshold: true,
      currentRaise: true,
      targetRaise: true,
      name: true,
    },
  });

  if (!fund) {
    return {
      allowed: false,
      thresholdEnabled: false,
      threshold: null,
      currentRaise: 0,
      percentComplete: 0,
      message: "Fund not found",
    };
  }

  const currentRaise = Number(fund.currentRaise);
  const threshold = fund.capitalCallThreshold
    ? Number(fund.capitalCallThreshold)
    : null;
  const targetRaise = Number(fund.targetRaise);

  const percentComplete = targetRaise > 0 
    ? Math.round((currentRaise / targetRaise) * 100) 
    : 0;

  if (!fund.capitalCallThresholdEnabled || !threshold) {
    return {
      allowed: true,
      thresholdEnabled: false,
      threshold: null,
      currentRaise,
      percentComplete,
    };
  }

  if (currentRaise >= threshold) {
    return {
      allowed: true,
      thresholdEnabled: true,
      threshold,
      currentRaise,
      percentComplete,
    };
  }

  const remaining = threshold - currentRaise;
  return {
    allowed: false,
    thresholdEnabled: true,
    threshold,
    currentRaise,
    percentComplete,
    message: `Capital calls require at least $${threshold.toLocaleString()} in committed capital. Current: $${currentRaise.toLocaleString()} (${percentComplete}%). Need $${remaining.toLocaleString()} more.`,
  };
}

export async function enforceCapitalCallThreshold(fundId: string): Promise<void> {
  const result = await checkCapitalCallThreshold(fundId);

  if (!result.allowed) {
    throw new Error(result.message || "Capital call threshold not met");
  }
}

export async function checkAndMarkThresholdReached(
  fundId: string
): Promise<{ reached: boolean; shouldNotify: boolean; fund: any }> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: {
      id: true,
      name: true,
      capitalCallThresholdEnabled: true,
      capitalCallThreshold: true,
      currentRaise: true,
      customSettings: true,
    },
  });

  if (!fund || !fund.capitalCallThresholdEnabled || !fund.capitalCallThreshold) {
    return { reached: false, shouldNotify: false, fund: null };
  }

  const currentRaise = Number(fund.currentRaise);
  const threshold = Number(fund.capitalCallThreshold);
  const reached = currentRaise >= threshold;

  const customSettings = (fund.customSettings as Record<string, any>) || {};
  const previouslyNotified = customSettings.thresholdNotifiedAt;

  if (!reached || previouslyNotified) {
    return { reached, shouldNotify: false, fund };
  }

  // Atomic update to prevent race condition
  try {
    const updated = await prisma.fund.updateMany({
      where: {
        id: fundId,
        customSettings: {
          path: ["thresholdNotifiedAt"],
          equals: null,
        },
      },
      data: {
        customSettings: {
          ...customSettings,
          thresholdNotifiedAt: new Date().toISOString(),
        },
      },
    });

    // If no rows updated, another process already marked it
    if (updated.count === 0) {
      return { reached: true, shouldNotify: false, fund };
    }

    return { reached: true, shouldNotify: true, fund };
  } catch {
    // Fallback for JSON path query not supported - use simple update
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        customSettings: {
          ...customSettings,
          thresholdNotifiedAt: new Date().toISOString(),
        },
      },
    });
    return { reached: true, shouldNotify: !previouslyNotified, fund };
  }
}

export async function checkThresholdReached(
  fundId: string
): Promise<{ reached: boolean; wasJustReached: boolean }> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: {
      capitalCallThresholdEnabled: true,
      capitalCallThreshold: true,
      currentRaise: true,
      customSettings: true,
    },
  });

  if (!fund || !fund.capitalCallThresholdEnabled || !fund.capitalCallThreshold) {
    return { reached: false, wasJustReached: false };
  }

  const currentRaise = Number(fund.currentRaise);
  const threshold = Number(fund.capitalCallThreshold);
  const reached = currentRaise >= threshold;

  const customSettings = (fund.customSettings as Record<string, any>) || {};
  const previouslyNotified = customSettings.thresholdNotifiedAt;

  return {
    reached,
    wasJustReached: reached && !previouslyNotified,
  };
}

export async function markThresholdNotified(fundId: string): Promise<void> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    select: { customSettings: true },
  });

  const currentSettings = (fund?.customSettings as Record<string, any>) || {};

  await prisma.fund.update({
    where: { id: fundId },
    data: {
      customSettings: {
        ...currentSettings,
        thresholdNotifiedAt: new Date().toISOString(),
      },
    },
  });
}
