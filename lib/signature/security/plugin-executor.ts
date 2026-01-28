import prisma from "@/lib/prisma";

export interface PluginConfig {
  id: string;
  name: string;
  type: "validator" | "formatter" | "prefill";
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface PluginExecutionContext {
  documentId: string;
  recipientId: string;
  fieldId?: string;
  fieldType?: string;
  value?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PluginResult {
  success: boolean;
  value?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function executePlugin(
  plugin: PluginConfig,
  context: PluginExecutionContext
): Promise<PluginResult> {
  const startTime = Date.now();
  
  try {
    if (!plugin.enabled) {
      return { success: true, value: context.value };
    }

    let result: PluginResult;

    switch (plugin.type) {
      case "validator":
        result = await executeValidatorPlugin(plugin, context);
        break;
      case "formatter":
        result = await executeFormatterPlugin(plugin, context);
        break;
      case "prefill":
        result = await executePrefillPlugin(plugin, context);
        break;
      default:
        result = { success: false, error: `Unknown plugin type: ${plugin.type}` };
    }

    await logPluginExecution(plugin, context, result, Date.now() - startTime);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const result: PluginResult = { success: false, error: errorMessage };
    
    await logPluginExecution(plugin, context, result, Date.now() - startTime);
    
    return result;
  }
}

async function executeValidatorPlugin(
  plugin: PluginConfig,
  context: PluginExecutionContext
): Promise<PluginResult> {
  const config = plugin.config as {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    customMessage?: string;
  };

  const value = context.value || "";

  if (config.required && !value.trim()) {
    return { 
      success: false, 
      error: config.customMessage || "This field is required" 
    };
  }

  if (config.minLength && value.length < config.minLength) {
    return { 
      success: false, 
      error: config.customMessage || `Minimum ${config.minLength} characters required` 
    };
  }

  if (config.maxLength && value.length > config.maxLength) {
    return { 
      success: false, 
      error: config.customMessage || `Maximum ${config.maxLength} characters allowed` 
    };
  }

  if (config.pattern) {
    try {
      const sanitizedPattern = sanitizeRegexPatternAtRuntime(config.pattern);
      const regex = new RegExp(sanitizedPattern);
      if (!regex.test(value)) {
        return { 
          success: false, 
          error: config.customMessage || "Value does not match required format" 
        };
      }
    } catch {
      return { 
        success: false, 
        error: "Invalid validation pattern" 
      };
    }
  }

  return { success: true, value };
}

function sanitizeRegexPatternAtRuntime(pattern: string): string {
  const dangerousPatterns = [
    /\(\?[=!<]/,
    /\{[0-9]{4,}\}/,
    /(\+|\*)\{/,
    /\(\.\*\)\+/,
    /\(.*\+\)\+/,
    /\(.*\*\)\*/,
  ];

  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      throw new Error("Potentially dangerous regex pattern");
    }
  }

  if (pattern.length > 500) {
    throw new Error("Regex pattern too long");
  }

  return pattern;
}

async function executeFormatterPlugin(
  plugin: PluginConfig,
  context: PluginExecutionContext
): Promise<PluginResult> {
  const config = plugin.config as {
    format?: "uppercase" | "lowercase" | "titlecase" | "trim";
    prefix?: string;
    suffix?: string;
  };

  let value = context.value || "";

  if (config.format === "uppercase") {
    value = value.toUpperCase();
  } else if (config.format === "lowercase") {
    value = value.toLowerCase();
  } else if (config.format === "titlecase") {
    value = value.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  } else if (config.format === "trim") {
    value = value.trim();
  }

  if (config.prefix) {
    value = config.prefix + value;
  }

  if (config.suffix) {
    value = value + config.suffix;
  }

  return { success: true, value };
}

async function executePrefillPlugin(
  plugin: PluginConfig,
  context: PluginExecutionContext
): Promise<PluginResult> {
  const config = plugin.config as {
    source?: "recipient" | "document" | "static";
    field?: string;
    staticValue?: string;
  };

  if (config.source === "static" && config.staticValue) {
    return { success: true, value: config.staticValue };
  }

  return { success: true, value: context.value };
}

async function logPluginExecution(
  plugin: PluginConfig,
  context: PluginExecutionContext,
  result: PluginResult,
  durationMs: number
): Promise<void> {
  try {
    await prisma.signatureAuditLog.create({
      data: {
        documentId: context.documentId,
        event: "PLUGIN_EXECUTED",
        recipientId: context.recipientId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        actionDuration: durationMs,
        metadata: {
          pluginId: plugin.id,
          pluginName: plugin.name,
          pluginType: plugin.type,
          fieldId: context.fieldId,
          fieldType: context.fieldType,
          success: result.success,
          error: result.error,
        },
      },
    });
  } catch (error) {
    console.error("Failed to log plugin execution:", error);
  }
}

export async function executePluginChain(
  plugins: PluginConfig[],
  context: PluginExecutionContext
): Promise<PluginResult> {
  let currentValue = context.value;

  for (const plugin of plugins) {
    const result = await executePlugin(plugin, {
      ...context,
      value: currentValue,
    });

    if (!result.success) {
      return result;
    }

    currentValue = result.value;
  }

  return { success: true, value: currentValue };
}
