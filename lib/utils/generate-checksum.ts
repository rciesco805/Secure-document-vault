import crypto from "crypto";

export function generateChecksum(url: string): string {
  const secret = process.env.NEXT_PRIVATE_VERIFICATION_SECRET;
  
  if (!secret) {
    throw new Error("NEXT_PRIVATE_VERIFICATION_SECRET environment variable is not set");
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(url);

  return hmac.digest("hex");
}
