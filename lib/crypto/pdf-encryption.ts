import { PDFDocument } from "pdf-lib-plus-encrypt";

export interface PDFEncryptionOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: PDFPermissions;
}

export interface PDFPermissions {
  printing?: "lowResolution" | "highResolution";
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
  fillingForms?: boolean;
  contentAccessibility?: boolean;
  documentAssembly?: boolean;
}

const DEFAULT_PERMISSIONS: PDFPermissions = {
  printing: "highResolution",
  modifying: false,
  copying: false,
  annotating: false,
  fillingForms: true,
  contentAccessibility: true,
  documentAssembly: false,
};

export async function encryptPDF(
  pdfBytes: Uint8Array | ArrayBuffer,
  options: PDFEncryptionOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const permissions = { ...DEFAULT_PERMISSIONS, ...options.permissions };

  await pdfDoc.encrypt({
    userPassword: options.userPassword || "",
    ownerPassword: options.ownerPassword || options.userPassword || "",
    permissions: {
      printing: permissions.printing,
      modifying: permissions.modifying,
      copying: permissions.copying,
      annotating: permissions.annotating,
      fillingForms: permissions.fillingForms,
      contentAccessibility: permissions.contentAccessibility,
      documentAssembly: permissions.documentAssembly,
    },
  });

  return pdfDoc.save();
}

export async function loadEncryptedPDF(
  pdfBytes: Uint8Array | ArrayBuffer,
  password: string
): Promise<PDFDocument> {
  return PDFDocument.load(pdfBytes, { password } as Record<string, unknown>);
}

export async function embedSignatureAndEncrypt(
  pdfBytes: Uint8Array | ArrayBuffer,
  signatureImage: Uint8Array,
  signaturePlacement: SignaturePlacement,
  encryptionOptions: PDFEncryptionOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const signatureImageEmbed = await pdfDoc.embedPng(signatureImage);

  const page = pdfDoc.getPage(signaturePlacement.pageNumber - 1);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const x = (signaturePlacement.x / 100) * pageWidth;
  const y = pageHeight - ((signaturePlacement.y / 100) * pageHeight) - signaturePlacement.height;

  page.drawImage(signatureImageEmbed, {
    x,
    y,
    width: signaturePlacement.width,
    height: signaturePlacement.height,
  });

  if (encryptionOptions.userPassword || encryptionOptions.ownerPassword) {
    await pdfDoc.encrypt({
      userPassword: encryptionOptions.userPassword || "",
      ownerPassword: encryptionOptions.ownerPassword || encryptionOptions.userPassword || "",
      permissions: {
        printing: encryptionOptions.permissions?.printing || "highResolution",
        modifying: encryptionOptions.permissions?.modifying || false,
        copying: encryptionOptions.permissions?.copying || false,
        annotating: encryptionOptions.permissions?.annotating || false,
        fillingForms: encryptionOptions.permissions?.fillingForms || true,
        contentAccessibility: encryptionOptions.permissions?.contentAccessibility || true,
        documentAssembly: encryptionOptions.permissions?.documentAssembly || false,
      },
    });
  }

  return pdfDoc.save();
}

export interface SignaturePlacement {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function addWatermarkAndEncrypt(
  pdfBytes: Uint8Array | ArrayBuffer,
  watermarkText: string,
  encryptionOptions: PDFEncryptionOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width / 4,
      y: height / 2,
      size: 50,
      opacity: 0.3,
    });
  }

  if (encryptionOptions.userPassword || encryptionOptions.ownerPassword) {
    await pdfDoc.encrypt({
      userPassword: encryptionOptions.userPassword || "",
      ownerPassword: encryptionOptions.ownerPassword || encryptionOptions.userPassword || "",
      permissions: encryptionOptions.permissions || DEFAULT_PERMISSIONS,
    });
  }

  return pdfDoc.save();
}

export async function getPDFMetadata(
  pdfBytes: Uint8Array | ArrayBuffer,
  password?: string
): Promise<{
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  pageCount: number;
  isEncrypted: boolean;
}> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, password ? { password } as Record<string, unknown> : undefined);
    return {
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer(),
      pageCount: pdfDoc.getPageCount(),
      isEncrypted: false,
    };
  } catch {
    return {
      pageCount: 0,
      isEncrypted: true,
    };
  }
}

export function generateDocumentPassword(length: number = 24): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const crypto = require("crypto");
  const randomBytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}
