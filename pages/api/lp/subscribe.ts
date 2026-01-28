import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { randomBytes } from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { putFileServer } from "@/lib/files/put-file-server";
import { newId } from "@/lib/id-helper";

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

    const { fundId, units, amount, tierId } = req.body;

    if (!fundId || !amount) {
      return res.status(400).json({ message: "Fund ID and amount are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        investorProfile: {
          include: {
            fund: true,
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(403).json({ message: "Investor profile not found" });
    }

    const investor = user.investorProfile;

    if (!investor.ndaSigned) {
      return res.status(403).json({ message: "NDA must be signed first" });
    }

    if (
      investor.accreditationStatus !== "SELF_CERTIFIED" &&
      investor.accreditationStatus !== "KYC_VERIFIED"
    ) {
      return res.status(403).json({
        message: "Accreditation must be completed before subscribing",
      });
    }

    if (investor.fundId && investor.fundId !== fundId) {
      return res.status(403).json({
        message: "You can only subscribe to your associated fund",
      });
    }

    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      include: {
        pricingTiers: {
          where: { isActive: true },
          orderBy: { tranche: "asc" },
        },
        team: true,
      },
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }

    const numAmount = parseFloat(amount);
    const numUnits = units ? parseInt(units, 10) : null;

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        message: "Invalid subscription amount",
      });
    }

    if (!fund.flatModeEnabled && (numUnits === null || isNaN(numUnits) || numUnits < 1)) {
      return res.status(400).json({
        message: "Invalid unit count for tiered subscription",
      });
    }

    if (numAmount < parseFloat(fund.minimumInvestment.toString())) {
      return res.status(400).json({
        message: `Minimum investment is $${parseFloat(fund.minimumInvestment.toString()).toLocaleString()}`,
      });
    }

    let selectedTier = null;
    let tierAllocations: { tierId: string; tranche: number; units: number; pricePerUnit: number; subtotal: number }[] = [];
    let computedAmount = numAmount;

    if (!fund.flatModeEnabled && numUnits) {
      const allTiers = await prisma.fundPricingTier.findMany({
        where: { fundId: fund.id, isActive: true },
        orderBy: { tranche: "asc" },
      });

      const totalAvailable = allTiers.reduce((sum, t) => sum + t.unitsAvailable, 0);
      if (numUnits > totalAvailable) {
        return res.status(400).json({
          message: `Only ${totalAvailable} units available across all tiers`,
        });
      }

      let unitsRemaining = numUnits;
      computedAmount = 0;

      for (const tier of allTiers) {
        if (unitsRemaining <= 0) break;
        const unitsFromTier = Math.min(unitsRemaining, tier.unitsAvailable);
        if (unitsFromTier > 0) {
          const pricePerUnit = parseFloat(tier.pricePerUnit.toString());
          const subtotal = unitsFromTier * pricePerUnit;
          tierAllocations.push({
            tierId: tier.id,
            tranche: tier.tranche,
            units: unitsFromTier,
            pricePerUnit,
            subtotal,
          });
          computedAmount += subtotal;
          unitsRemaining -= unitsFromTier;
        }
      }

      if (tierAllocations.length === 0) {
        return res.status(400).json({ message: "No pricing tier available" });
      }

      selectedTier = allTiers.find((t) => t.id === tierAllocations[0].tierId);

      const tolerance = 0.01;
      if (Math.abs(computedAmount - numAmount) > tolerance) {
        return res.status(400).json({
          message: `Amount mismatch: expected $${computedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} for ${numUnits} units`,
          expectedAmount: computedAmount,
          tierBreakdown: tierAllocations,
        });
      }
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let y = height - 60;

    page.drawText("SUBSCRIPTION AGREEMENT", {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    page.drawText(fund.name, {
      x: 50,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 30;

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 40;

    const finalAmount = fund.flatModeEnabled ? numAmount : computedAmount;
    const details = [
      ["Subscriber:", investor.entityName || user.name || "Individual Investor"],
      ["Email:", user.email || ""],
      ["Subscription Amount:", `$${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ];

    if (numUnits && tierAllocations.length > 0) {
      details.push(["Number of Units:", numUnits.toLocaleString()]);
      if (tierAllocations.length === 1) {
        details.push(
          ["Price per Unit:", `$${tierAllocations[0].pricePerUnit.toLocaleString()}`],
          ["Pricing Tier:", `Tier ${tierAllocations[0].tranche}`]
        );
      } else {
        const avgPrice = finalAmount / numUnits;
        details.push(
          ["Blended Price per Unit:", `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
          ["Tiers Used:", tierAllocations.map(t => `Tier ${t.tranche} (${t.units} units @ $${t.pricePerUnit})`).join(", ")]
        );
      }
    }

    for (const [label, value] of details) {
      page.drawText(label, { x: 50, y, size: 11, font: boldFont });
      page.drawText(value, { x: 180, y, size: 11, font });
      y -= 20;
    }

    y -= 20;
    page.drawText("TERMS AND CONDITIONS", {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    });
    y -= 20;

    const terms = [
      "1. The undersigned hereby subscribes for the investment amount specified above.",
      "2. The subscriber represents that they are an accredited investor as defined by SEC Rule 501.",
      "3. The subscriber acknowledges receipt of offering materials and has had the opportunity",
      "   to ask questions about the investment.",
      "4. This subscription is irrevocable and binding upon execution.",
      "5. The fund reserves the right to accept or reject this subscription in whole or in part.",
    ];

    for (const term of terms) {
      page.drawText(term, { x: 50, y, size: 10, font });
      y -= 16;
    }

    y -= 30;
    page.drawText("SIGNATURE", { x: 50, y, size: 12, font: boldFont });
    y -= 30;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 300, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText("Subscriber Signature", { x: 50, y, size: 9, font });

    y -= 30;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 300, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 15;
    page.drawText("Date", { x: 50, y, size: 9, font });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const signingToken = randomBytes(32).toString("hex");
    const docId = newId("doc");

    const { type: storageType, data: filePath } = await putFileServer({
      file: {
        name: `subscription-agreement-${docId}.pdf`,
        type: "application/pdf",
        buffer: pdfBuffer,
      },
      teamId: fund.teamId,
      docId,
    });

    if (!filePath) {
      throw new Error("Failed to upload subscription document");
    }

    const result = await prisma.$transaction(async (tx) => {
      if (tierAllocations.length > 0 && numUnits) {
        for (const allocation of tierAllocations) {
          const tier = await tx.fundPricingTier.findUnique({
            where: { id: allocation.tierId },
          });

          if (!tier || tier.unitsAvailable < allocation.units) {
            throw new Error(
              `Tier ${allocation.tranche} no longer has ${allocation.units} units available`
            );
          }

          const newUnitsAvailable = tier.unitsAvailable - allocation.units;
          await tx.fundPricingTier.update({
            where: { id: allocation.tierId },
            data: {
              unitsAvailable: { decrement: allocation.units },
              isActive: newUnitsAvailable > 0,
            },
          });
        }
      }

      const docAmount = fund.flatModeEnabled ? numAmount : computedAmount;
      const document = await tx.signatureDocument.create({
        data: {
          title: `Subscription Agreement - ${investor.entityName || user.name || "Investor"}`,
          description: `Subscription for ${fund.name}: $${docAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          file: filePath,
          storageType: storageType || "S3_PATH",
          status: "SENT",
          sentAt: new Date(),
          documentType: "SUBSCRIPTION",
          subscriptionAmount: docAmount,
          investorId: investor.id,
          metadata: {
            fundId: fund.id,
            units: numUnits,
            tierBreakdown: tierAllocations.length > 0 ? tierAllocations : undefined,
            autoGenerated: true,
          },
          teamId: fund.teamId,
          recipients: {
            create: {
              name: investor.entityName || user.name || "Investor",
              email: user.email || "",
              role: "SIGNER",
              signingOrder: 1,
              status: "PENDING",
              signingToken,
            },
          },
        },
        include: { recipients: true },
      });

      const subscriptionAmount = fund.flatModeEnabled ? numAmount : computedAmount;
      const subscription = await tx.subscription.create({
        data: {
          investorId: investor.id,
          fundId: fund.id,
          signatureDocumentId: document.id,
          amount: subscriptionAmount,
          units: numUnits,
          pricingTierId: selectedTier?.id,
          status: "PENDING",
          tierBreakdown: tierAllocations.length > 0 ? (tierAllocations as any) : undefined,
        },
      });

      return { document, subscription, signingToken, subscriptionAmount };
    });

    return res.status(201).json({
      success: true,
      signingUrl: `/view/sign/${result.signingToken}`,
      subscription: {
        id: result.subscription.id,
        amount: result.subscriptionAmount,
        units: numUnits,
        status: "PENDING",
        tierBreakdown: tierAllocations.length > 1 ? tierAllocations : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error creating LP subscription:", error);
    return res.status(500).json({
      message: error.message || "Failed to create subscription",
    });
  }
}
