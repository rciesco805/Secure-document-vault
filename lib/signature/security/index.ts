export {
  executePlugin,
  executePluginChain,
  type PluginConfig,
  type PluginExecutionContext,
  type PluginResult,
} from "./plugin-executor";

export {
  validatePluginConfig,
  validateSignatureFieldConfig,
  validateDocumentConfig,
  validateAndSanitizePlugins,
  sanitizeRegexPattern,
  type ValidationResult,
} from "./config-validator";

export {
  logSignatureAudit,
  logCustomFieldAction,
  logSecurityViolation,
  logConfigValidationFailure,
  getAuditTrailForDocument,
  generateComplianceReport,
  type SignatureAuditEvent,
  type AuditLogData,
} from "./audit-logger";

export {
  executeSandboxed,
  createSafeValidator,
  validateWithTimeout,
  getExecutionStats,
  resetExecutionStats,
  recordExecution,
  type SandboxConfig,
  type SandboxResult,
  type ValidatorFunction,
  type SafeExecutionStats,
} from "./sandbox";

export const SECURITY_BEST_PRACTICES = {
  serverSideOnly: true,
  configValidation: true,
  auditLogging: true,
  timeoutProtection: true,
  pkiReadyForFutureEnhancement: true,
  
  documentation: `
    SECURITY BEST PRACTICES FOR FUND DOCUMENTS
    ==========================================
    
    1. NO CLIENT-SIDE PLUGIN EXECUTION
       - All plugins run server-side only during signer flow
       - Client receives only rendered results, never executable code
       - Prevents XSS, code injection, and unauthorized data access
    
    2. CONFIG VALIDATION
       - All plugin configs validated against JSON schema (Zod) before save
       - Regex patterns checked for ReDoS vulnerabilities at save AND runtime
       - Input sanitization prevents injection attacks
       - Maximum lengths enforced to prevent DoS
    
    3. AUDIT ALL PLUGIN ACTIONS
       - Every plugin execution logged to SignatureAuditLog
       - Custom field actions tracked with full context
       - Security violations immediately logged and flagged
       - Compliance reports generated on demand
    
    4. TIMEOUT PROTECTION FOR VALIDATORS
       - Validator execution wrapped with timeout (default 1000ms)
       - Regex patterns validated for ReDoS vulnerabilities at runtime
       - Built-in validators use predefined logic (regex, length, email, phone, etc.)
       - NOTE: For true code isolation (arbitrary code execution), use vm2/isolated-vm
    
    5. PKI CONSIDERATION (FUTURE ENHANCEMENT)
       - Architecture ready for Certificate Authority integration
       - Digital signature support can be added for legally-binding signatures
       - HSM (Hardware Security Module) integration possible
       - Timestamping service integration point available
  `,
};
