import { NextApiRequest, NextApiResponse } from "next";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { documentVersionId } = req.query;

  if (!documentVersionId || typeof documentVersionId !== "string") {
    return res.status(400).json({ error: "Document version ID is required" });
  }

  try {
    // Try to use Trigger.dev if configured
    const { generateTriggerPublicAccessToken } = await import(
      "@/lib/utils/generate-trigger-auth-token"
    );
    
    const publicAccessToken = await generateTriggerPublicAccessToken(
      `version:${documentVersionId}`,
    );
    return res.status(200).json({ publicAccessToken });
  } catch (error: any) {
    // If Trigger.dev is not configured or fails, return a graceful fallback
    console.warn("Trigger.dev not configured or failed:", error?.message);
    return res.status(200).json({ 
      publicAccessToken: null,
      status: "not_configured",
      message: "Document processing status not available"
    });
  }
}
