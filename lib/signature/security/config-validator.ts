import { z } from "zod";

const ValidatorPluginConfigSchema = z.object({
  pattern: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  required: z.boolean().optional(),
  customMessage: z.string().max(500).optional(),
});

const FormatterPluginConfigSchema = z.object({
  format: z.enum(["uppercase", "lowercase", "titlecase", "trim"]).optional(),
  prefix: z.string().max(100).optional(),
  suffix: z.string().max(100).optional(),
});

const PrefillPluginConfigSchema = z.object({
  source: z.enum(["recipient", "document", "static"]).optional(),
  field: z.string().max(100).optional(),
  staticValue: z.string().max(1000).optional(),
});

const PluginConfigSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(["validator", "formatter", "prefill"]),
  enabled: z.boolean().default(true),
  config: z.union([
    ValidatorPluginConfigSchema,
    FormatterPluginConfigSchema,
    PrefillPluginConfigSchema,
  ]),
});

const SignatureFieldConfigSchema = z.object({
  type: z.enum([
    "SIGNATURE",
    "INITIALS", 
    "DATE_SIGNED",
    "TEXT",
    "CHECKBOX",
    "NAME",
    "EMAIL",
    "COMPANY",
    "TITLE",
    "ADDRESS",
  ]),
  pageNumber: z.number().int().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
  label: z.string().max(200).optional(),
  placeholder: z.string().max(500).optional(),
  required: z.boolean().default(true),
  plugins: z.array(PluginConfigSchema).max(10).optional(),
});

const SignatureDocumentConfigSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  emailSubject: z.string().max(200).optional(),
  emailMessage: z.string().max(5000).optional(),
  expirationDays: z.number().int().min(1).max(365).optional(),
  requireAccessCode: z.boolean().optional(),
  fields: z.array(SignatureFieldConfigSchema).min(1).max(100),
  recipients: z.array(z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    role: z.enum(["SIGNER", "VIEWER", "APPROVER"]).default("SIGNER"),
    signingOrder: z.number().int().min(1).max(100).optional(),
  })).min(1).max(50),
});

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
  sanitizedConfig?: unknown;
}

export function validatePluginConfig(config: unknown): ValidationResult {
  try {
    const result = PluginConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        errors: [],
        sanitizedConfig: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        path: "",
        message: error instanceof Error ? error.message : "Unknown validation error",
      }],
    };
  }
}

export function validateSignatureFieldConfig(config: unknown): ValidationResult {
  try {
    const result = SignatureFieldConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        errors: [],
        sanitizedConfig: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        path: "",
        message: error instanceof Error ? error.message : "Unknown validation error",
      }],
    };
  }
}

export function validateDocumentConfig(config: unknown): ValidationResult {
  try {
    const result = SignatureDocumentConfigSchema.safeParse(config);
    
    if (result.success) {
      return {
        valid: true,
        errors: [],
        sanitizedConfig: result.data,
      };
    }

    return {
      valid: false,
      errors: result.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        path: "",
        message: error instanceof Error ? error.message : "Unknown validation error",
      }],
    };
  }
}

export function sanitizeRegexPattern(pattern: string): string {
  const dangerousPatterns = [
    /\(\?[=!<]/,
    /\{[0-9]{4,}\}/,
    /(\+|\*)\{/,
    /\(\.\*\)\+/,
  ];

  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      throw new Error("Potentially dangerous regex pattern detected");
    }
  }

  if (pattern.length > 500) {
    throw new Error("Regex pattern too long (max 500 characters)");
  }

  return pattern;
}

export function validateAndSanitizePlugins(
  plugins: unknown[]
): { valid: boolean; plugins: unknown[]; errors: string[] } {
  const validatedPlugins: unknown[] = [];
  const errors: string[] = [];

  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const result = validatePluginConfig(plugin);

    if (result.valid) {
      const sanitized = result.sanitizedConfig as Record<string, unknown>;
      
      if (sanitized.type === "validator" && typeof sanitized.config === "object") {
        const config = sanitized.config as Record<string, unknown>;
        if (typeof config.pattern === "string") {
          try {
            config.pattern = sanitizeRegexPattern(config.pattern);
          } catch (error) {
            errors.push(`Plugin ${i}: ${error instanceof Error ? error.message : "Invalid pattern"}`);
            continue;
          }
        }
      }

      validatedPlugins.push(sanitized);
    } else {
      errors.push(...result.errors.map((e) => `Plugin ${i} (${e.path}): ${e.message}`));
    }
  }

  return {
    valid: errors.length === 0,
    plugins: validatedPlugins,
    errors,
  };
}
