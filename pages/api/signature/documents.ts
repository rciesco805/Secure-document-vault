import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateApiToken } from "@/lib/api/auth/validate-api-token";

const QuerySchema = z.object({
  id: z.string().cuid().optional(),
  status: z.enum([
    "DRAFT", "SENT", "VIEWED", "PARTIALLY_SIGNED", 
    "COMPLETED", "DECLINED", "VOIDED", "EXPIRED"
  ]).optional(),
  documentType: z.string().optional(),
  investorId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "title", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
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

    const { id, status, documentType, investorId, page, limit, sortBy, sortOrder } = validation.data;

    if (id) {
      const document = await prisma.signatureDocument.findFirst({
        where: { id, teamId },
        include: {
          recipients: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              signingOrder: true,
              viewedAt: true,
              signedAt: true,
              declinedAt: true,
              declinedReason: true,
            },
          },
          fields: {
            select: {
              id: true,
              type: true,
              pageNumber: true,
              x: true,
              y: true,
              width: true,
              height: true,
              label: true,
              required: true,
              value: true,
              filledAt: true,
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      return res.status(200).json(document);
    }

    const where = {
      teamId,
      ...(status && { status }),
      ...(documentType && { documentType }),
      ...(investorId && { investorId }),
    };

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      prisma.signatureDocument.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          documentType: true,
          createdAt: true,
          updatedAt: true,
          sentAt: true,
          completedAt: true,
          expirationDate: true,
          _count: {
            select: {
              recipients: true,
              fields: true,
            },
          },
        },
      }),
      prisma.signatureDocument.count({ where }),
    ]);

    return res.status(200).json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Documents query error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
