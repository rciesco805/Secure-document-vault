import type { NextApiRequest, NextApiResponse } from "next";
import { isAdminEmail } from "@/lib/constants/admins";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  const isAdmin = isAdminEmail(email);

  return res.status(200).json({ isAdmin });
}
