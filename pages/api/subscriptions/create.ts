import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { sendEmail } from "@/lib/resend";
import { randomBytes } from "crypto";
import SignatureRequestEmail from "@/components/emails/signature-request";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      investorId,
      fundId,
      amount,
      file,
      title,
      description,
      emailSubject,
      emailMessage,
      teamId,
    } = req.body;

    if (!investorId || !amount || !file || !teamId) {
      return res.status(400).json({
        message: "Investor ID, amount, file, and team ID are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { teamId },
          include: { team: true },
        },
      },
    });

    if (!user?.teams?.[0]) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const team = user.teams[0].team;
    const role = user.teams[0].role;
    if (!["ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { user: true },
    });

    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }

    const signingToken = randomBytes(32).toString("hex");

    const document = await prisma.signatureDocument.create({
      data: {
        title: title || `Subscription Agreement - ${investor.entityName || investor.user?.name || "Investor"}`,
        description: description || `Subscription amount: $${parseFloat(amount).toLocaleString()}`,
        file,
        storageType: "S3_PATH",
        status: "SENT",
        sentAt: new Date(),
        emailSubject: emailSubject || "Action Required: Sign Your Subscription Agreement",
        emailMessage: emailMessage || `Please review and sign your subscription agreement for $${parseFloat(amount).toLocaleString()}.`,
        documentType: "SUBSCRIPTION",
        subscriptionAmount: parseFloat(amount),
        investorId,
        metadata: {
          fundId: fundId || null,
          createdByEmail: session.user.email,
          subscriptionAmount: parseFloat(amount),
        },
        teamId,
        createdById: user.id,
        recipients: {
          create: {
            name: investor.entityName || investor.user?.name || "Investor",
            email: investor.user?.email || "",
            role: "SIGNER",
            signingOrder: 1,
            status: "PENDING",
            signingToken,
          },
        },
      },
      include: {
        recipients: true,
      },
    });

    await prisma.subscription.create({
      data: {
        investorId,
        fundId: fundId || null,
        signatureDocumentId: document.id,
        amount: parseFloat(amount),
        status: "PENDING",
      },
    });

    const signingUrl = `${process.env.NEXTAUTH_URL}/view/sign/${signingToken}`;

    if (investor.user?.email) {
      try {
        await sendEmail({
          to: investor.user.email,
          subject: document.emailSubject || "Sign Your Subscription Agreement",
          react: SignatureRequestEmail({
            recipientName: investor.entityName || investor.user.name || "Investor",
            documentTitle: document.title,
            senderName: "BF Fund",
            teamName: team.name,
            message: `Subscription Amount: $${parseFloat(amount).toLocaleString()}`,
            signingUrl: signingUrl,
          }),
        });
      } catch (emailError) {
        console.error("Error sending signature email:", emailError);
      }
    }

    return res.status(201).json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        subscriptionAmount: document.subscriptionAmount?.toString(),
        signingUrl,
      },
    });
  } catch (error) {
    console.error("Error creating subscription document:", error);
    return res.status(500).json({ message: "Failed to create subscription" });
  }
}
