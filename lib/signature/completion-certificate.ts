import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";
import crypto from "crypto";
import { SignatureChecksum } from "./checksum";

export interface CertificateRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  signedAt: Date | null;
  ipAddress: string | null;
  signatureChecksum: SignatureChecksum | null;
}

export interface CertificateAuditEvent {
  event: string;
  timestamp: Date;
  recipientEmail?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, any>;
}

export interface CertificateData {
  documentId: string;
  documentTitle: string;
  organizationName: string;
  createdAt: Date;
  sentAt: Date | null;
  completedAt: Date;
  recipients: CertificateRecipient[];
  auditEvents: CertificateAuditEvent[];
  documentHash: string;
}

export interface CompletionCertificate {
  pdfBytes: Uint8Array;
  certificateId: string;
  certificateHash: string;
  generatedAt: Date;
}

const CERTIFICATE_VERSION = "1.0";
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const LINE_HEIGHT = 14;

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function formatEventName(event: string): string {
  const eventMap: Record<string, string> = {
    "document.created": "Document Created",
    "document.sent": "Document Sent",
    "document.viewed": "Document Viewed",
    "document.downloaded": "Document Downloaded",
    "recipient.signed": "Recipient Signed",
    "recipient.declined": "Recipient Declined",
    "document.completed": "Document Completed",
    "document.voided": "Document Voided",
    "document.expired": "Document Expired",
    "field.completed": "Field Completed",
    "reminder.sent": "Reminder Sent",
  };
  return eventMap[event] || event;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

async function drawHeader(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  data: CertificateData,
  certificateId: string
): Promise<number> {
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText("COMPLETION CERTIFICATE", {
    x: MARGIN,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  y -= 30;

  page.drawText("Electronic Signature Verification Certificate", {
    x: MARGIN,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 25;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 25;

  page.drawText(`Certificate ID: ${certificateId}`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= LINE_HEIGHT;

  page.drawText(`Generated: ${formatDate(new Date())}`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 25;

  return y;
}

async function drawDocumentInfo(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  data: CertificateData,
  startY: number
): Promise<number> {
  let y = startY;

  page.drawText("DOCUMENT INFORMATION", {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  y -= 20;

  const docInfo = [
    ["Title:", data.documentTitle],
    ["Document ID:", data.documentId],
    ["Organization:", data.organizationName],
    ["Created:", formatDate(data.createdAt)],
    ["Sent:", data.sentAt ? formatDate(data.sentAt) : "N/A"],
    ["Completed:", formatDate(data.completedAt)],
    ["Document Hash:", truncateText(data.documentHash, 50)],
  ];

  for (const [label, value] of docInfo) {
    page.drawText(label, {
      x: MARGIN,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(value, {
      x: MARGIN + 100,
      y,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= LINE_HEIGHT;
  }

  y -= 15;
  return y;
}

async function drawSignerInfo(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  recipients: CertificateRecipient[],
  startY: number
): Promise<number> {
  let y = startY;

  page.drawText("SIGNER INFORMATION", {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  y -= 20;

  for (const recipient of recipients) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 55,
      width: PAGE_WIDTH - 2 * MARGIN,
      height: 60,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    page.drawText(`${recipient.name} (${recipient.email})`, {
      x: MARGIN + 10,
      y: y - 5,
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(`Role: ${recipient.role}  |  Status: ${recipient.status}`, {
      x: MARGIN + 10,
      y: y - 20,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    if (recipient.signedAt) {
      page.drawText(`Signed: ${formatDate(recipient.signedAt)}`, {
        x: MARGIN + 10,
        y: y - 35,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    if (recipient.ipAddress) {
      page.drawText(`IP Address: ${recipient.ipAddress}`, {
        x: MARGIN + 300,
        y: y - 35,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    if (recipient.signatureChecksum) {
      page.drawText(
        `Signature Hash: ${truncateText(recipient.signatureChecksum.signatureHash, 30)}`,
        {
          x: MARGIN + 10,
          y: y - 50,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        }
      );
    }

    y -= 70;
  }

  y -= 10;
  return y;
}

async function drawAuditTrail(
  pdfDoc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  events: CertificateAuditEvent[],
  startY: number,
  currentPage: PDFPage
): Promise<{ page: PDFPage; y: number }> {
  let page = currentPage;
  let y = startY;

  if (y < 150) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  page.drawText("AUDIT TRAIL", {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  y -= 5;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 15;

  const headers = ["Timestamp", "Event", "Participant", "IP Address"];
  const colWidths = [150, 120, 140, 100];
  let xPos = MARGIN;

  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: xPos,
      y,
      size: 9,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    xPos += colWidths[i];
  }
  y -= 15;

  for (const event of events) {
    if (y < 80) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    xPos = MARGIN;
    const eventData = [
      formatDate(event.timestamp),
      formatEventName(event.event),
      event.recipientEmail || "System",
      event.ipAddress || "N/A",
    ];

    for (let i = 0; i < eventData.length; i++) {
      page.drawText(truncateText(eventData[i], 20), {
        x: xPos,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      xPos += colWidths[i];
    }
    y -= LINE_HEIGHT;
  }

  return { page, y };
}

async function drawCompliance(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  startY: number
): Promise<number> {
  let y = startY;

  if (y < 200) return y;

  y -= 20;

  page.drawText("COMPLIANCE STATEMENT", {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  y -= 20;

  const complianceText = [
    "This document was signed electronically in compliance with:",
    "",
    "• The Electronic Signatures in Global and National Commerce Act (ESIGN Act)",
    "• The Uniform Electronic Transactions Act (UETA)",
    "• Applicable federal and state electronic signature laws",
    "",
    "All signers provided explicit consent to use electronic signatures and acknowledged",
    "their understanding of the legal validity of their electronic signatures.",
    "",
    "The audit trail above provides a complete and unalterable record of all actions",
    "taken on this document, including timestamps, IP addresses, and cryptographic",
    "hashes for verification purposes.",
  ];

  for (const line of complianceText) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= LINE_HEIGHT;
  }

  return y;
}

async function drawFooter(
  page: PDFPage,
  font: PDFFont,
  certificateHash: string
): Promise<void> {
  const y = 40;

  page.drawLine({
    start: { x: MARGIN, y: y + 15 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 15 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(
    `Certificate Hash: ${certificateHash}`,
    {
      x: MARGIN,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  page.drawText(`Certificate Version: ${CERTIFICATE_VERSION}`, {
    x: MARGIN,
    y: y - 12,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText("BF Fund Investor Dataroom - Electronic Signature Platform", {
    x: PAGE_WIDTH - MARGIN - 250,
    y: y - 12,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

export function generateCertificateId(documentId: string, completedAt: Date): string {
  const data = `${documentId}:${completedAt.toISOString()}:${CERTIFICATE_VERSION}`;
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex")
    .substring(0, 16)
    .toUpperCase();
}

export function generateCertificateHash(pdfBytes: Uint8Array): string {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(pdfBytes))
    .digest("hex");
}

export async function generateCompletionCertificate(
  data: CertificateData
): Promise<CompletionCertificate> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const certificateId = generateCertificateId(data.documentId, data.completedAt);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  let y = await drawHeader(page, font, boldFont, data, certificateId);
  y = await drawDocumentInfo(page, font, boldFont, data, y);
  y = await drawSignerInfo(page, font, boldFont, data.recipients, y);

  const result = await drawAuditTrail(
    pdfDoc,
    font,
    boldFont,
    data.auditEvents,
    y,
    page
  );
  page = result.page;
  y = result.y;

  y = await drawCompliance(page, font, boldFont, y);

  const pdfBytes = await pdfDoc.save();
  const certificateHash = generateCertificateHash(pdfBytes);

  const pages = pdfDoc.getPages();
  for (const p of pages) {
    await drawFooter(p, font, certificateHash);
  }

  const finalPdfBytes = await pdfDoc.save();
  const finalCertificateHash = generateCertificateHash(finalPdfBytes);

  return {
    pdfBytes: finalPdfBytes,
    certificateId,
    certificateHash: finalCertificateHash,
    generatedAt: new Date(),
  };
}

export async function verifyCertificateHash(
  pdfBytes: Uint8Array,
  expectedHash: string
): Promise<boolean> {
  const actualHash = generateCertificateHash(pdfBytes);
  return actualHash === expectedHash;
}
