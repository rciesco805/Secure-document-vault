import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 5;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const ip = 
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ message: "Too many requests. Please try again later." });
  }

  try {
    const { name, email, entityName } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { investorProfile: true },
    });

    if (user) {
      if (!user.investorProfile) {
        await prisma.investor.create({
          data: {
            userId: user.id,
            entityName: entityName || null,
            entityType: entityName ? "ENTITY" : "INDIVIDUAL",
          },
        });
      }
      if (user.role !== "LP") {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "LP" },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          role: "LP",
          investorProfile: {
            create: {
              entityName: entityName || null,
              entityType: entityName ? "ENTITY" : "INDIVIDUAL",
            },
          },
        },
        include: { investorProfile: true },
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Account created successfully" 
    });
  } catch (error: any) {
    console.error("LP registration error:", error);
    return res.status(500).json({ 
      message: error.message || "Internal server error" 
    });
  }
}
