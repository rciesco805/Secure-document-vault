import { NextApiRequest, NextApiResponse } from "next";

import * as mupdf from "mupdf";

import { getFile } from "@/lib/files/get-file";
import { putFileServer } from "@/lib/files/put-file-server";
import prisma from "@/lib/prisma";

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { documentVersionId, teamId } = req.body as {
    documentVersionId: string;
    teamId: string;
  };

  try {
    const documentVersion = await prisma.documentVersion.findUnique({
      where: { id: documentVersionId },
      select: {
        id: true,
        file: true,
        storageType: true,
        numPages: true,
        document: {
          select: { id: true },
        },
      },
    });

    if (!documentVersion) {
      return res.status(404).json({ error: "Document version not found" });
    }

    const signedUrl = await getFile({
      type: documentVersion.storageType,
      data: documentVersion.file,
    });

    if (!signedUrl) {
      return res.status(500).json({ error: "Failed to get file URL" });
    }

    const response = await fetch(signedUrl);
    const pdfData = await response.arrayBuffer();
    const doc = new mupdf.PDFDocument(pdfData);
    const numPages = doc.countPages();

    const firstPage = doc.loadPage(0);
    const bounds = firstPage.getBounds();
    const [ulx, uly, lrx, lry] = bounds;
    const widthInPoints = Math.abs(lrx - ulx);
    const heightInPoints = Math.abs(lry - uly);
    const isVertical = heightInPoints > widthInPoints;
    firstPage.destroy();

    await prisma.documentVersion.update({
      where: { id: documentVersionId },
      data: { numPages, isVertical },
    });

    const match = documentVersion.file.match(/(doc_[^\/]+)\//);
    const docId = match ? match[1] : undefined;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const existingPage = await prisma.documentPage.findUnique({
        where: {
          pageNumber_versionId: {
            pageNumber: pageNum,
            versionId: documentVersionId,
          },
        },
      });

      if (existingPage) continue;

      const page = doc.loadPage(pageNum - 1);
      const pageBounds = page.getBounds();
      const [px1, py1, px2, py2] = pageBounds;
      const pageWidth = Math.abs(px2 - px1);
      const pageHeight = Math.abs(py2 - py1);

      const MAX_PIXEL_DIMENSION = 4000;
      const MAX_TOTAL_PIXELS = 16_000_000;
      let scaleFactor = pageWidth >= 1600 ? 2 : 2.5;

      const scaledWidth = pageWidth * scaleFactor;
      const scaledHeight = pageHeight * scaleFactor;
      const totalPixels = scaledWidth * scaledHeight;

      if (
        scaledWidth > MAX_PIXEL_DIMENSION ||
        scaledHeight > MAX_PIXEL_DIMENSION ||
        totalPixels > MAX_TOTAL_PIXELS
      ) {
        const maxScaleByWidth = MAX_PIXEL_DIMENSION / pageWidth;
        const maxScaleByHeight = MAX_PIXEL_DIMENSION / pageHeight;
        const maxScaleByTotal = Math.sqrt(MAX_TOTAL_PIXELS / (pageWidth * pageHeight));
        scaleFactor = Math.max(1, Math.min(maxScaleByWidth, maxScaleByHeight, maxScaleByTotal));
      }

      const doc_to_screen = mupdf.Matrix.scale(scaleFactor, scaleFactor);

      const links = page.getLinks();
      const embeddedLinks = links.map((link) => ({
        href: link.getURI(),
        coords: link.getBounds().join(","),
      }));

      let scaledPixmap;
      let actualScaleFactor = scaleFactor;

      try {
        scaledPixmap = page.toPixmap(doc_to_screen, mupdf.ColorSpace.DeviceRGB, false, true);
      } catch {
        const reducedScaleFactor = Math.max(1, scaleFactor * 0.5);
        const reduced_doc_to_screen = mupdf.Matrix.scale(reducedScaleFactor, reducedScaleFactor);
        scaledPixmap = page.toPixmap(reduced_doc_to_screen, mupdf.ColorSpace.DeviceRGB, false, true);
        actualScaleFactor = reducedScaleFactor;
      }

      const metadata = {
        originalWidth: pageWidth,
        originalHeight: pageHeight,
        width: pageWidth * actualScaleFactor,
        height: pageHeight * actualScaleFactor,
        scaleFactor: actualScaleFactor,
      };

      const pngBuffer = scaledPixmap.asPNG();
      const jpegBuffer = scaledPixmap.asJPEG(80, false);

      let chosenBuffer;
      let chosenFormat;
      if (pngBuffer.byteLength < jpegBuffer.byteLength) {
        chosenBuffer = pngBuffer;
        chosenFormat = "png";
      } else {
        chosenBuffer = jpegBuffer;
        chosenFormat = "jpeg";
      }

      const buffer = Buffer.from(chosenBuffer);

      const { type, data } = await putFileServer({
        file: {
          name: `page-${pageNum}.${chosenFormat}`,
          type: `image/${chosenFormat}`,
          buffer: buffer,
        },
        teamId: teamId,
        docId: docId,
      });

      scaledPixmap.destroy();
      page.destroy();

      if (data && type) {
        await prisma.documentPage.create({
          data: {
            versionId: documentVersionId,
            pageNumber: pageNum,
            file: data,
            storageType: type,
            pageLinks: embeddedLinks,
            metadata: metadata,
          },
        });
      }
    }

    doc.destroy();

    await prisma.documentVersion.update({
      where: { id: documentVersionId },
      data: { hasPages: true },
    });

    return res.status(200).json({
      success: true,
      numPages,
      documentVersionId,
    });
  } catch (error) {
    console.error("Local PDF processing error:", error);
    return res.status(500).json({
      error: "Failed to process PDF",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
