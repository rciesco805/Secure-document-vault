import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export interface OfferingDocument {
  id: string;
  name: string;
  description: string;
  url: string;
  version: string;
  required: boolean;
  order: number;
}

const DEFAULT_OFFERING_DOCUMENTS: OfferingDocument[] = [
  {
    id: "lpa",
    name: "Limited Partnership Agreement",
    description: "The legal agreement between the GP and LPs",
    url: "/fund-documents/LPA.pdf",
    version: "4.0",
    required: true,
    order: 1,
  },
  {
    id: "ppm",
    name: "Private Placement Memorandum",
    description: "Investment risks, terms, and fund strategy",
    url: "/fund-documents/PPM.pdf",
    version: "2.0",
    required: true,
    order: 2,
  },
  {
    id: "subscription",
    name: "Subscription Agreement",
    description: "Investment subscription form",
    url: "/fund-documents/Subscription-Agreement.pdf",
    version: "2.0",
    required: true,
    order: 3,
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const investor = await prisma.investor.findFirst({
      where: {
        user: { email: session.user.email },
      },
      include: {
        fund: true,
      },
    });

    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }

    let documents: OfferingDocument[] = DEFAULT_OFFERING_DOCUMENTS;

    if (investor.fund) {
      const fundData = investor.fund as any;
      if (fundData.offeringDocuments && Array.isArray(fundData.offeringDocuments)) {
        documents = fundData.offeringDocuments;
      }
    }

    documents.sort((a, b) => a.order - b.order);

    return res.status(200).json({
      documents,
      fundName: investor.fund?.name || "Fund",
    });
  } catch (error) {
    console.error("[OFFERING_DOCUMENTS] Error:", error);
    return res.status(500).json({ message: "Failed to fetch offering documents" });
  }
}
