import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId } = req.query as { teamId: string };

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      teamId,
      userId: (session.user as any).id,
    },
  });

  if (!userTeam) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, teamId);
  } else if (req.method === "POST") {
    return handlePost(req, res, teamId, (session.user as any).id);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const { status, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { teamId };
    if (status) {
      where.status = status;
    }

    const [documents, total] = await Promise.all([
      prisma.signatureDocument.findMany({
        where,
        include: {
          recipients: {
            orderBy: { signingOrder: "asc" },
          },
          _count: {
            select: {
              recipients: true,
              fields: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.signatureDocument.count({ where }),
    ]);

    return res.status(200).json({
      documents,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching signature documents:", error);
    return res.status(500).json({ message: "Failed to fetch documents" });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    const {
      title,
      description,
      file,
      storageType = "S3_PATH",
      emailSubject,
      emailMessage,
      recipients = [],
      status = "DRAFT",
      expirationDate,
    } = req.body;

    if (!title || !file) {
      return res.status(400).json({ message: "Title and file are required" });
    }

    const document = await prisma.signatureDocument.create({
      data: {
        title,
        description,
        file,
        storageType,
        emailSubject,
        emailMessage,
        status,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        teamId,
        createdById: userId,
        recipients: {
          create: recipients.map((r: any, index: number) => ({
            name: r.name,
            email: r.email,
            role: r.role || "SIGNER",
            signingOrder: r.signingOrder || index + 1,
            status: "PENDING",
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error("Error creating signature document:", error);
    return res.status(500).json({ message: "Failed to create document" });
  }
}
