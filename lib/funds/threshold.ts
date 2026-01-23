import prisma from "@/lib/prisma";

export type ThresholdCheckResult = {
  allowed: boolean;
  initialThresholdEnabled: boolean;
  initialThreshold: number | null;
  fullAuthorizedAmount: number | null;
  totalCommitted: number;
  initialThresholdProgress: number;
  fullAuthorizedProgress: number;
  initialThresholdMet: boolean;
  message?: string;
  // Legacy fields for backward compatibility
  thresholdEnabled: boolean;
  threshold: number | null;
  currentRaise: number;
  percentComplete: number;
};

export async function checkCapitalCallThreshold(
  fundId: string
): Promise<ThresholdCheckResult> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      aggregate: true,
    },
  });

  if (!fund) {
    return {
      allowed: false,
      initialThresholdEnabled: false,
      initialThreshold: null,
      fullAuthorizedAmount: null,
      totalCommitted: 0,
      initialThresholdProgress: 0,
      fullAuthorizedProgress: 0,
      initialThresholdMet: false,
      message: "Fund not found",
      thresholdEnabled: false,
      threshold: null,
      currentRaise: 0,
      percentComplete: 0,
    };
  }

  const totalCommitted = fund.aggregate ? Number(fund.aggregate.totalCommitted) : Number(fund.currentRaise);
  const currentRaise = Number(fund.currentRaise);
  
  // Check initial threshold (new fields first, then legacy)
  const initialThresholdEnabled = fund.initialThresholdEnabled || fund.capitalCallThresholdEnabled;
  const initialThreshold = fund.initialThresholdAmount 
    ? Number(fund.initialThresholdAmount) 
    : fund.capitalCallThreshold 
      ? Number(fund.capitalCallThreshold) 
      : null;
  
  // Full authorized amount (for progress tracking)
  const fullAuthorizedAmount = fund.fullAuthorizedAmount 
    ? Number(fund.fullAuthorizedAmount) 
    : Number(fund.targetRaise);

  // Calculate progress percentages
  const initialThresholdProgress = initialThreshold && initialThreshold > 0 
    ? Math.min(100, Math.round((totalCommitted / initialThreshold) * 100)) 
    : 0;
  
  const fullAuthorizedProgress = fullAuthorizedAmount > 0 
    ? Math.min(100, Math.round((totalCommitted / fullAuthorizedAmount) * 100)) 
    : 0;

  const initialThresholdMet = !initialThresholdEnabled || 
    !initialThreshold || 
    totalCommitted >= initialThreshold;

  // Legacy percentComplete based on targetRaise
  const targetRaise = Number(fund.targetRaise);
  const percentComplete = targetRaise > 0 
    ? Math.round((currentRaise / targetRaise) * 100) 
    : 0;

  if (!initialThresholdEnabled || !initialThreshold) {
    return {
      allowed: true,
      initialThresholdEnabled: false,
      initialThreshold: null,
      fullAuthorizedAmount,
      totalCommitted,
      initialThresholdProgress: 0,
      fullAuthorizedProgress,
      initialThresholdMet: true,
      thresholdEnabled: false,
      threshold: null,
      currentRaise,
      percentComplete,
    };
  }

  if (totalCommitted >= initialThreshold) {
    return {
      allowed: true,
      initialThresholdEnabled: true,
      initialThreshold,
      fullAuthorizedAmount,
      totalCommitted,
      initialThresholdProgress,
      fullAuthorizedProgress,
      initialThresholdMet: true,
      thresholdEnabled: true,
      threshold: initialThreshold,
      currentRaise,
      percentComplete,
    };
  }

  const remaining = initialThreshold - totalCommitted;
  return {
    allowed: false,
    initialThresholdEnabled: true,
    initialThreshold,
    fullAuthorizedAmount,
    totalCommitted,
    initialThresholdProgress,
    fullAuthorizedProgress,
    initialThresholdMet: false,
    message: `Initial closing threshold not met. Capital calls require at least $${initialThreshold.toLocaleString()} in committed capital. Current: $${totalCommitted.toLocaleString()} (${initialThresholdProgress}%). Need $${remaining.toLocaleString()} more.`,
    thresholdEnabled: true,
    threshold: initialThreshold,
    currentRaise,
    percentComplete,
  };
}

export async function enforceCapitalCallThreshold(fundId: string): Promise<void> {
  const result = await checkCapitalCallThreshold(fundId);

  if (!result.allowed) {
    throw new Error(result.message || "Initial closing threshold not met");
  }
}

export async function updateAggregateProgress(
  fundId: string,
  newCommittedAmount?: number
): Promise<void> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: { aggregate: true },
  });

  if (!fund || !fund.aggregate) return;

  const totalCommitted = newCommittedAmount ?? Number(fund.aggregate.totalCommitted);
  
  const initialThreshold = fund.initialThresholdAmount 
    ? Number(fund.initialThresholdAmount) 
    : fund.capitalCallThreshold 
      ? Number(fund.capitalCallThreshold) 
      : null;
  
  const fullAuthorizedAmount = fund.fullAuthorizedAmount 
    ? Number(fund.fullAuthorizedAmount) 
    : Number(fund.targetRaise);

  const initialThresholdMet = !initialThreshold || totalCommitted >= initialThreshold;
  const fullAuthorizedProgress = fullAuthorizedAmount > 0 
    ? Math.min(100, (totalCommitted / fullAuthorizedAmount) * 100) 
    : 0;

  const updates: any = {
    fullAuthorizedProgress,
  };

  if (initialThresholdMet && !fund.aggregate.initialThresholdMet) {
    updates.initialThresholdMet = true;
    updates.initialThresholdMetAt = new Date();
  }

  await prisma.fundAggregate.update({
    where: { id: fund.aggregate.id },
    data: updates,
  });
}

export async function checkAndMarkThresholdReached(
  fundId: string
): Promise<{ reached: boolean; shouldNotify: boolean; fund: any }> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: { aggregate: true },
  });

  if (!fund) {
    return { reached: false, shouldNotify: false, fund: null };
  }

  const initialThresholdEnabled = fund.initialThresholdEnabled || fund.capitalCallThresholdEnabled;
  const initialThreshold = fund.initialThresholdAmount 
    ? Number(fund.initialThresholdAmount) 
    : fund.capitalCallThreshold 
      ? Number(fund.capitalCallThreshold) 
      : null;

  if (!initialThresholdEnabled || !initialThreshold) {
    return { reached: false, shouldNotify: false, fund: null };
  }

  const totalCommitted = fund.aggregate ? Number(fund.aggregate.totalCommitted) : Number(fund.currentRaise);
  const reached = totalCommitted >= initialThreshold;

  // Check if already notified via aggregate or customSettings
  const alreadyNotified = fund.aggregate?.initialThresholdMet || 
    (fund.customSettings as any)?.thresholdNotifiedAt;

  if (!reached || alreadyNotified) {
    return { reached, shouldNotify: false, fund };
  }

  // Mark as reached in aggregate
  if (fund.aggregate) {
    try {
      const updated = await prisma.fundAggregate.updateMany({
        where: {
          id: fund.aggregate.id,
          initialThresholdMet: false,
        },
        data: {
          initialThresholdMet: true,
          initialThresholdMetAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return { reached: true, shouldNotify: false, fund };
      }

      return { reached: true, shouldNotify: true, fund };
    } catch {
      await prisma.fundAggregate.update({
        where: { id: fund.aggregate.id },
        data: {
          initialThresholdMet: true,
          initialThresholdMetAt: new Date(),
        },
      });
      return { reached: true, shouldNotify: true, fund };
    }
  }

  // Fallback to customSettings for funds without aggregate
  const customSettings = (fund.customSettings as Record<string, any>) || {};
  try {
    await prisma.fund.update({
      where: { id: fundId },
      data: {
        customSettings: {
          ...customSettings,
          thresholdNotifiedAt: new Date().toISOString(),
        },
      },
    });
    return { reached: true, shouldNotify: true, fund };
  } catch {
    return { reached: true, shouldNotify: false, fund };
  }
}

export async function checkThresholdReached(
  fundId: string
): Promise<{ reached: boolean; wasJustReached: boolean }> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: { aggregate: true },
  });

  if (!fund) {
    return { reached: false, wasJustReached: false };
  }

  const initialThresholdEnabled = fund.initialThresholdEnabled || fund.capitalCallThresholdEnabled;
  const initialThreshold = fund.initialThresholdAmount 
    ? Number(fund.initialThresholdAmount) 
    : fund.capitalCallThreshold 
      ? Number(fund.capitalCallThreshold) 
      : null;

  if (!initialThresholdEnabled || !initialThreshold) {
    return { reached: false, wasJustReached: false };
  }

  const totalCommitted = fund.aggregate ? Number(fund.aggregate.totalCommitted) : Number(fund.currentRaise);
  const reached = totalCommitted >= initialThreshold;

  const alreadyNotified = fund.aggregate?.initialThresholdMet || 
    (fund.customSettings as any)?.thresholdNotifiedAt;

  return {
    reached,
    wasJustReached: reached && !alreadyNotified,
  };
}

export async function markThresholdNotified(fundId: string): Promise<void> {
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: { aggregate: true },
  });

  if (fund?.aggregate) {
    await prisma.fundAggregate.update({
      where: { id: fund.aggregate.id },
      data: {
        initialThresholdMet: true,
        initialThresholdMetAt: new Date(),
      },
    });
  } else if (fund) {
    const currentSettings = (fund.customSettings as Record<string, any>) || {};
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
}
