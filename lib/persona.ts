/**
 * Persona KYC/AML Integration Service
 * 
 * Handles identity verification for 506(c) compliance.
 * Persona API docs: https://docs.withpersona.com/reference
 */

const PERSONA_API_BASE = "https://api.withpersona.com/api/v1";

interface PersonaConfig {
  apiKey: string;
  templateId?: string;
  environment?: "sandbox" | "production";
}

interface CreateInquiryParams {
  referenceId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  templateId?: string;
  redirectUri?: string;
}

interface PersonaInquiry {
  id: string;
  type: string;
  attributes: {
    status: string;
    "reference-id": string;
    "created-at": string;
    "started-at"?: string;
    "completed-at"?: string;
    "failed-at"?: string;
    "redacted-at"?: string;
    "expired-at"?: string;
    fields?: Record<string, any>;
  };
}

interface PersonaWebhookPayload {
  data: {
    type: string;
    id: string;
    attributes: {
      name: string;
      payload: {
        data: {
          type: string;
          id: string;
          attributes: Record<string, any>;
        };
      };
    };
  };
}

function getConfig(): PersonaConfig {
  const apiKey = process.env.PERSONA_API_KEY;
  if (!apiKey) {
    throw new Error("PERSONA_API_KEY environment variable is not set");
  }
  return {
    apiKey,
    templateId: process.env.PERSONA_TEMPLATE_ID,
    environment: (process.env.PERSONA_ENVIRONMENT as "sandbox" | "production") || "sandbox",
  };
}

function getHeaders(): Record<string, string> {
  const { apiKey } = getConfig();
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Persona-Version": "2023-01-05",
    "Key-Inflection": "camel",
  };
}

/**
 * Create a new Persona inquiry for KYC verification
 */
export async function createInquiry(params: CreateInquiryParams): Promise<PersonaInquiry> {
  const config = getConfig();
  const templateId = params.templateId || config.templateId;
  
  if (!templateId) {
    throw new Error("Persona template ID is required");
  }

  const response = await fetch(`${PERSONA_API_BASE}/inquiries`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        attributes: {
          "inquiry-template-id": templateId,
          "reference-id": params.referenceId,
          "redirect-uri": params.redirectUri,
          fields: {
            "email-address": params.email,
            ...(params.firstName && { "name-first": params.firstName }),
            ...(params.lastName && { "name-last": params.lastName }),
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Persona API error:", error);
    throw new Error(`Failed to create Persona inquiry: ${response.status}`);
  }

  const result = await response.json();
  return result.data as PersonaInquiry;
}

/**
 * Get an existing inquiry by ID
 */
export async function getInquiry(inquiryId: string): Promise<PersonaInquiry> {
  const response = await fetch(`${PERSONA_API_BASE}/inquiries/${inquiryId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Persona inquiry: ${response.status}`);
  }

  const result = await response.json();
  return result.data as PersonaInquiry;
}

/**
 * Resume an existing inquiry (returns a one-time link)
 */
export async function resumeInquiry(inquiryId: string): Promise<{ sessionToken: string }> {
  const response = await fetch(`${PERSONA_API_BASE}/inquiries/${inquiryId}/resume`, {
    method: "POST",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to resume Persona inquiry: ${response.status}`);
  }

  const result = await response.json();
  return {
    sessionToken: result.meta?.["session-token"] || "",
  };
}

/**
 * Map Persona status to our internal status
 */
export function mapPersonaStatus(personaStatus: string): string {
  const statusMap: Record<string, string> = {
    "created": "PENDING",
    "pending": "PENDING",
    "completed": "APPROVED",
    "approved": "APPROVED",
    "declined": "DECLINED",
    "failed": "DECLINED",
    "expired": "EXPIRED",
    "needs_review": "NEEDS_REVIEW",
  };
  return statusMap[personaStatus.toLowerCase()] || "PENDING";
}

/**
 * Verify Persona webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    
    // Ensure signatures have equal length before comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    // Return false for any malformed signature
    return false;
  }
}

/**
 * Parse Persona webhook event
 */
export function parseWebhookEvent(payload: PersonaWebhookPayload): {
  eventName: string;
  inquiryId: string;
  status: string;
  referenceId: string;
  data: Record<string, any>;
} {
  const event = payload.data.attributes;
  const inquiry = event.payload.data;
  
  return {
    eventName: event.name,
    inquiryId: inquiry.id,
    status: inquiry.attributes.status || "",
    referenceId: inquiry.attributes["reference-id"] || "",
    data: inquiry.attributes,
  };
}

/**
 * Check if Persona is configured
 */
export function isPersonaConfigured(): boolean {
  return !!(process.env.PERSONA_API_KEY && process.env.PERSONA_TEMPLATE_ID);
}

/**
 * Get the Persona environment ID for embedded flow
 */
export function getPersonaEnvironmentId(): string {
  return process.env.PERSONA_ENVIRONMENT_ID || "";
}

/**
 * Get the Persona template ID for embedded flow
 */
export function getPersonaTemplateId(): string {
  return process.env.PERSONA_TEMPLATE_ID || "";
}
