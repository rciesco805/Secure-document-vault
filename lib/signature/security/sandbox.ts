export interface SandboxConfig {
  timeoutMs: number;
}

const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  timeoutMs: 1000,
};

export interface SandboxResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  executionTimeMs: number;
}

export async function executeSandboxed<T>(
  fn: () => T | Promise<T>,
  config: Partial<SandboxConfig> = {}
): Promise<SandboxResult<T>> {
  const fullConfig = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      (async () => fn())(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timeout after ${fullConfig.timeoutMs}ms`)),
          fullConfig.timeoutMs
        )
      ),
    ]);

    return {
      success: true,
      result,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export interface ValidatorFunction {
  (value: string, context: Record<string, unknown>): boolean | string;
}

export function createSafeValidator(
  validatorCode: string
): ValidatorFunction | null {
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /new\s+Function/,
    /import\s*\(/,
    /require\s*\(/,
    /process\./,
    /global\./,
    /window\./,
    /document\./,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /__proto__/,
    /prototype/,
    /constructor/,
    /Proxy/,
    /Reflect/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(validatorCode)) {
      console.warn("Dangerous pattern detected in validator code:", pattern);
      return null;
    }
  }

  if (validatorCode.length > 2000) {
    console.warn("Validator code too long");
    return null;
  }

  return (value: string, context: Record<string, unknown>): boolean | string => {
    try {
      if (validatorCode.includes("regex:")) {
        const pattern = validatorCode.replace("regex:", "").trim();
        const regex = new RegExp(pattern);
        return regex.test(value) ? true : "Value does not match required pattern";
      }

      if (validatorCode.includes("length:")) {
        const params = validatorCode.replace("length:", "").trim();
        const [min, max] = params.split("-").map(Number);
        if (value.length < min) return `Minimum ${min} characters required`;
        if (max && value.length > max) return `Maximum ${max} characters allowed`;
        return true;
      }

      if (validatorCode.includes("email")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? true : "Invalid email address";
      }

      if (validatorCode.includes("phone")) {
        const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
        return phoneRegex.test(value) ? true : "Invalid phone number";
      }

      if (validatorCode.includes("numeric")) {
        return /^\d+$/.test(value) ? true : "Only numbers allowed";
      }

      if (validatorCode.includes("alphanumeric")) {
        return /^[a-zA-Z0-9]+$/.test(value) ? true : "Only letters and numbers allowed";
      }

      return true;
    } catch (error) {
      console.error("Validator execution error:", error);
      return "Validation error";
    }
  };
}

export async function validateWithTimeout(
  validator: ValidatorFunction,
  value: string,
  context: Record<string, unknown>,
  timeoutMs: number = 1000
): Promise<{ valid: boolean; message?: string }> {
  const result = await executeSandboxed(
    () => validator(value, context),
    { timeoutMs }
  );

  if (!result.success) {
    return {
      valid: false,
      message: result.error || "Validation failed",
    };
  }

  if (result.result === true) {
    return { valid: true };
  }

  if (typeof result.result === "string") {
    return { valid: false, message: result.result };
  }

  return { valid: false, message: "Validation failed" };
}

export interface SafeExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;
  averageExecutionTimeMs: number;
}

const executionStats: SafeExecutionStats = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  timeoutExecutions: 0,
  averageExecutionTimeMs: 0,
};

export function recordExecution(success: boolean, isTimeout: boolean, executionTimeMs: number): void {
  executionStats.totalExecutions++;
  if (success) {
    executionStats.successfulExecutions++;
  } else if (isTimeout) {
    executionStats.timeoutExecutions++;
  } else {
    executionStats.failedExecutions++;
  }

  executionStats.averageExecutionTimeMs = (
    (executionStats.averageExecutionTimeMs * (executionStats.totalExecutions - 1) + executionTimeMs) /
    executionStats.totalExecutions
  );
}

export function getExecutionStats(): SafeExecutionStats {
  return { ...executionStats };
}

export function resetExecutionStats(): void {
  executionStats.totalExecutions = 0;
  executionStats.successfulExecutions = 0;
  executionStats.failedExecutions = 0;
  executionStats.timeoutExecutions = 0;
  executionStats.averageExecutionTimeMs = 0;
}
