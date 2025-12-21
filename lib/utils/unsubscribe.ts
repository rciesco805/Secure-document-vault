import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXT_PRIVATE_UNSUBSCRIBE_JWT_SECRET;
const UNSUBSCRIBE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type UnsubscribePayload = {
  viewerId: string;
  teamId: string;
  dataroomId?: string;
  exp?: number;
};

export function generateUnsubscribeUrl(payload: UnsubscribePayload): string {
  if (!JWT_SECRET) {
    throw new Error("NEXT_PRIVATE_UNSUBSCRIBE_JWT_SECRET environment variable is not set");
  }
  if (!UNSUBSCRIBE_BASE_URL) {
    throw new Error("NEXT_PUBLIC_BASE_URL environment variable is not set");
  }

  const tokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET);
  return `${UNSUBSCRIBE_BASE_URL}/api/unsubscribe/${
    payload.dataroomId ? "dataroom" : "yir"
  }?token=${token}`;
}

export function verifyUnsubscribeToken(
  token: string,
): UnsubscribePayload | null {
  if (!JWT_SECRET) {
    console.error("NEXT_PRIVATE_UNSUBSCRIBE_JWT_SECRET environment variable is not set");
    return null;
  }
  
  try {
    return jwt.verify(token, JWT_SECRET) as UnsubscribePayload;
  } catch (error) {
    return null;
  }
}
