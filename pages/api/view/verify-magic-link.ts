import { NextApiRequest, NextApiResponse } from "next";

import { verifyVisitorMagicLink } from "@/lib/auth/create-visitor-magic-link";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { token, email, linkId } = req.body as {
    token: string;
    email: string;
    linkId: string;
  };

  if (!token || !email || !linkId) {
    return res.status(400).json({ 
      verified: false, 
      message: "Missing required parameters" 
    });
  }

  try {
    const isValid = await verifyVisitorMagicLink({
      token,
      email,
      linkId,
    });

    if (isValid) {
      return res.status(200).json({ 
        verified: true, 
        email: email.trim().toLowerCase() 
      });
    } else {
      return res.status(200).json({ 
        verified: false, 
        message: "Invalid or expired magic link" 
      });
    }
  } catch (error) {
    console.error("Magic link verification error:", error);
    return res.status(500).json({ 
      verified: false, 
      message: "Verification failed" 
    });
  }
}
