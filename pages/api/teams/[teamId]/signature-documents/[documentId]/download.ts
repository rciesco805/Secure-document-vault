import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { getFile } from "@/lib/files/get-file";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId, documentId } = req.query as {
    teamId: string;
    documentId: string;
  };

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      teamId,
      userId: (session.user as any).id,
    },
  });

  if (!userTeam) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const document = await prisma.signatureDocument.findFirst({
      where: {
        id: documentId,
        teamId,
      },
      include: {
        recipients: {
          orderBy: { signingOrder: "asc" },
        },
        fields: {
          orderBy: [{ pageNumber: "asc" }, { y: "asc" }],
        },
        team: {
          select: { name: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const fileUrl = await getFile({ type: document.storageType, data: document.file });

    if (!fileUrl) {
      return res.status(404).json({ message: "Document file not found" });
    }

    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
      return res.status(500).json({ message: "Failed to fetch document file" });
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const field of document.fields) {
      if (!field.value && field.type !== "SIGNATURE") continue;

      const pageIndex = field.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const x = (field.x / 100) * pageWidth;
      const y = pageHeight - ((field.y / 100) * pageHeight) - ((field.height / 100) * pageHeight);
      const fieldWidth = (field.width / 100) * pageWidth;
      const fieldHeight = (field.height / 100) * pageHeight;

      if (field.type === "SIGNATURE") {
        const recipient = document.recipients.find((r) => r.id === field.recipientId);
        if (recipient?.signatureImage) {
          try {
            const signatureData = recipient.signatureImage;
            
            if (signatureData.startsWith("data:image/png")) {
              const base64Data = signatureData.split(",")[1];
              const signatureBytes = Buffer.from(base64Data, "base64");
              const signatureImage = await pdfDoc.embedPng(signatureBytes);
              
              const aspectRatio = signatureImage.width / signatureImage.height;
              let drawWidth = fieldWidth;
              let drawHeight = fieldWidth / aspectRatio;
              
              if (drawHeight > fieldHeight) {
                drawHeight = fieldHeight;
                drawWidth = fieldHeight * aspectRatio;
              }
              
              page.drawImage(signatureImage, {
                x: x + (fieldWidth - drawWidth) / 2,
                y: y + (fieldHeight - drawHeight) / 2,
                width: drawWidth,
                height: drawHeight,
              });
            }
          } catch (err) {
            console.error("Failed to embed signature:", err);
          }
        }
      } else if (field.value) {
        const fontSize = Math.min(fieldHeight * 0.6, 12);
        page.drawText(field.value, {
          x: x + 4,
          y: y + fieldHeight / 2 - fontSize / 3,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }
    }

    if (document.status === "COMPLETED") {
      const lastPage = pages[pages.length - 1];
      const { width: pageWidth, height: pageHeight } = lastPage.getSize();

      const auditBoxHeight = 80 + document.recipients.length * 14;
      const auditBoxY = 20;
      const auditBoxX = 20;
      const auditBoxWidth = pageWidth - 40;

      lastPage.drawRectangle({
        x: auditBoxX,
        y: auditBoxY,
        width: auditBoxWidth,
        height: auditBoxHeight,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      let textY = auditBoxY + auditBoxHeight - 16;

      lastPage.drawText("Certificate of Completion", {
        x: auditBoxX + 10,
        y: textY,
        size: 10,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      textY -= 14;
      lastPage.drawText(`Document: ${document.title}`, {
        x: auditBoxX + 10,
        y: textY,
        size: 8,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      textY -= 12;
      lastPage.drawText(
        `Completed: ${new Date(document.completedAt!).toLocaleString("en-US", {
          dateStyle: "long",
          timeStyle: "short",
        })}`,
        {
          x: auditBoxX + 10,
          y: textY,
          size: 8,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        }
      );

      textY -= 16;
      lastPage.drawText("Signers:", {
        x: auditBoxX + 10,
        y: textY,
        size: 8,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.3),
      });

      for (const recipient of document.recipients.filter((r) => r.status === "SIGNED")) {
        textY -= 12;
        const signedDate = recipient.signedAt
          ? new Date(recipient.signedAt).toLocaleString("en-US", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "";
        lastPage.drawText(
          `  ${recipient.name} (${recipient.email}) - Signed ${signedDate}${
            recipient.ipAddress ? ` from ${recipient.ipAddress}` : ""
          }`,
          {
            x: auditBoxX + 10,
            y: textY,
            size: 7,
            font: helveticaFont,
            color: rgb(0.4, 0.4, 0.4),
          }
        );
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();

    const safeTitle = document.title.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = document.status === "COMPLETED" 
      ? `${safeTitle}_signed.pdf`
      : `${safeTitle}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", modifiedPdfBytes.byteLength);

    return res.send(Buffer.from(modifiedPdfBytes));
  } catch (error) {
    console.error("Error downloading signed document:", error);
    return res.status(500).json({ message: "Failed to download document" });
  }
}
