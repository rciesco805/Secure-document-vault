import type { NextApiRequest, NextApiResponse } from "next";
import { serverInstance } from "@/lib/rollbar";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const testError = new Error("Rollbar test error - integration verification");
    serverInstance.error(testError, {
      source: "test-error-route",
      timestamp: new Date().toISOString(),
    });
    
    return res.status(200).json({
      success: true,
      message: "Test error sent to Rollbar",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serverInstance.error(error as Error);
    return res.status(500).json({ error: "Failed to send test error" });
  }
}
