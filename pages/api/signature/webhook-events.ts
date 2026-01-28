import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateApiToken } from "@/lib/api/auth/validate-api-token";

const QuerySchema = z.object({
  documentId: z.string().cuid().optional(),
  event: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await validateApiToken(req.headers.authorization);
  
  if (!auth.valid || !auth.teamId) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: auth.error || "Valid API token required" 
    });
  }

  const { teamId } = auth;

  try {
    const validation = QuerySchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors,
      });
    }

    const { documentId, event, startDate, endDate, page, limit } = validation.data;

    const teamDocumentIds = await prisma.signatureDocument.findMany({
      where: { teamId },
      select: { id: true },
    });

    const documentIds = teamDocumentIds.map(d => d.id);

    const where = {
      documentId: documentId ? documentId : { in: documentIds },
      ...(event && { event: { contains: event } }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.signatureAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          documentId: true,
          event: true,
          recipientEmail: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.signatureAuditLog.count({ where }),
    ]);

    return res.status(200).json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Webhook events query error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
