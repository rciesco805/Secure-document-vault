import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getFile } from "@/lib/files/get-file";
import { sendEmail } from "@/lib/resend";
import SignatureCompletedEmail from "@/components/emails/signature-completed";
import CapitalCallThresholdEmail from "@/components/emails/capital-call-threshold";
import { sendToNextSigners } from "@/pages/api/teams/[teamId]/signature-documents/[documentId]/send";
import { ratelimit } from "@/lib/redis";
import {
  onRecipientSigned,
  onDocumentCompleted,
  onDocumentDeclined,
  onDocumentViewed,
} from "@/lib/webhook/triggers/signature-events";
import { logSignatureEvent } from "@/lib/signature/audit-logger";
import { 
  createSignatureChecksum, 
  createConsentRecord,
  ESIGN_CONSENT_TEXT,
  ESIGN_CONSENT_VERSION,
} from "@/lib/signature/checksum";
import {
  getEncryptedSignatureForStorage,
  processDocumentCompletion,
} from "@/lib/signature/encryption-service";
import { checkAndAlertAnomalies } from "@/lib/security/anomaly-detection";
import { reportError } from "@/lib/error";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token } = req.query as { token: string };

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] 
    || req.socket.remoteAddress 
    || "unknown";
  
  const limiter = ratelimit(req.method === "POST" ? 10 : 30, "1 m");
  const { success, limit, remaining, reset } = await limiter.limit(`sign:${ipAddress}`);
  
  if (!success) {
    const resetTime = typeof reset === 'number' && reset > 1e12 ? reset : reset * 1000;
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.floor(resetTime / 1000));
    return res.status(429).json({ 
      message: "Too many requests. Please try again later.",
      retryAfter: Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))
    });
  }

  if (req.method === "GET") {
    return handleGet(req, res, token);
  } else if (req.method === "POST") {
    return handlePost(req, res, token);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  token: string
) {
  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] 
    || req.socket.remoteAddress 
    || "unknown";
  const userAgent = req.headers["user-agent"] || null;

  try {
    const recipient = await prisma.signatureRecipient.findUnique({
      where: { signingToken: token },
      include: {
        document: {
          include: {
            fields: {
              orderBy: [{ pageNumber: "asc" }, { y: "asc" }],
            },
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return res.status(404).json({ message: "Invalid or expired signing link" });
    }

    const { document } = recipient;

    if (document.expirationDate && new Date(document.expirationDate) < new Date()) {
      return res.status(410).json({ message: "This signing link has expired" });
    }

    if (document.status === "VOIDED") {
      return res.status(410).json({ message: "This document has been voided" });
    }

    if (document.status === "EXPIRED") {
      return res.status(410).json({ message: "This document has expired" });
    }

    if (document.status === "COMPLETED") {
      return res.status(400).json({ message: "This document has already been completed" });
    }

    if (recipient.status === "SIGNED") {
      return res.status(400).json({ 
        message: "You have already signed this document",
        alreadySigned: true 
      });
    }

    if (recipient.status === "DECLINED") {
      return res.status(400).json({ message: "You have declined this document" });
    }

    const recipientFields = document.fields.filter(
      (f) => f.recipientId === recipient.id
    );

    let fileUrl = null;
    try {
      fileUrl = await getFile({ 
        type: document.storageType, 
        data: document.file 
      });
    } catch (error) {
      console.error("Error getting file URL:", error);
    }

    if (recipient.status === "PENDING" || recipient.status === "SENT") {
      await prisma.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "VIEWED",
          viewedAt: new Date(),
        },
      });

      if (document.status === "SENT") {
        await prisma.signatureDocument.update({
          where: { id: document.id },
          data: { status: "VIEWED" },
        });
      }

      logSignatureEvent(req, {
        documentId: document.id,
        event: "document.viewed",
        recipientId: recipient.id,
        recipientEmail: recipient.email,
      }).catch(console.error);

      onDocumentViewed({
        documentId: document.id,
        documentTitle: document.title,
        teamId: document.teamId,
        teamName: document.team.name,
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        ipAddress,
        userAgent,
      }).catch(console.error);
    }

    return res.status(200).json({
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
        status: recipient.status === "PENDING" || recipient.status === "SENT" 
          ? "VIEWED" 
          : recipient.status,
      },
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        numPages: document.numPages,
        teamName: document.team.name,
        fileUrl,
        expirationDate: document.expirationDate,
      },
      fields: recipientFields.map((f) => ({
        id: f.id,
        type: f.type,
        pageNumber: f.pageNumber,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
        placeholder: f.placeholder,
        value: f.value,
      })),
    });
  } catch (error) {
    reportError(error, {
      path: '/api/sign/[token]',
      action: 'fetch_signing_document',
      method: 'GET',
    });
    console.error("Error fetching signing document:", error);
    return res.status(500).json({ message: "Failed to load document" });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  token: string
) {
  try {
    const { fields, signatureImage, declined, declinedReason, consentConfirmed } = req.body;

    const recipient = await prisma.signatureRecipient.findUnique({
      where: { signingToken: token },
      include: {
        document: {
          include: {
            recipients: true,
            fields: true,
            team: {
              select: {
                name: true,
              },
            },
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return res.status(404).json({ message: "Invalid signing link" });
    }

    const { document } = recipient;

    if (document.expirationDate && new Date(document.expirationDate) < new Date()) {
      return res.status(410).json({ message: "This signing link has expired" });
    }

    if (document.status === "VOIDED" || document.status === "EXPIRED") {
      return res.status(410).json({ message: "This document is no longer available for signing" });
    }

    if (document.status === "COMPLETED") {
      return res.status(400).json({ message: "This document has already been completed" });
    }

    if (recipient.status === "SIGNED") {
      return res.status(400).json({ message: "You have already signed this document" });
    }

    if (recipient.status === "DECLINED") {
      return res.status(400).json({ message: "You have already declined this document" });
    }

    const { allowed: anomalyAllowed, alerts } = await checkAndAlertAnomalies(req, recipient.id);
    if (!anomalyAllowed) {
      console.warn(`[SECURITY] Blocked signing attempt for recipient ${recipient.id} due to anomalies:`, alerts);
      return res.status(403).json({ 
        message: "Access blocked due to suspicious activity. Please try again later or contact support.",
        code: "ANOMALY_DETECTED"
      });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] 
      || req.socket.remoteAddress 
      || null;
    const userAgent = req.headers["user-agent"] || null;

    if (declined) {
      await prisma.$transaction(async (tx) => {
        await tx.signatureRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "DECLINED",
            declinedAt: new Date(),
            declinedReason: declinedReason || null,
            ipAddress,
            userAgent,
          },
        });

        await tx.signatureDocument.update({
          where: { id: document.id },
          data: {
            status: "DECLINED",
            declinedAt: new Date(),
          },
        });
      });

      logSignatureEvent(req, {
        documentId: document.id,
        event: "recipient.declined",
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        metadata: { reason: declinedReason },
      }).catch(console.error);

      onDocumentDeclined({
        documentId: document.id,
        documentTitle: document.title,
        teamId: document.teamId,
        teamName: document.team.name,
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        ipAddress,
        userAgent,
      }).catch(console.error);

      return res.status(200).json({ 
        message: "Document declined",
        status: "DECLINED" 
      });
    }

    const recipientFields = document.fields.filter(
      (f) => f.recipientId === recipient.id
    );
    const recipientFieldIds = new Set(recipientFields.map((f) => f.id));

    const requiredSignatureFields = recipientFields.filter(
      (f) => f.type === "SIGNATURE" && f.required
    );
    if (requiredSignatureFields.length > 0 && !signatureImage) {
      return res.status(400).json({ 
        message: "Signature is required to complete signing" 
      });
    }

    if (!consentConfirmed) {
      return res.status(400).json({
        message: "You must consent to electronic signatures to sign this document",
        requiresConsent: true,
        consentText: ESIGN_CONSENT_TEXT,
        consentVersion: ESIGN_CONSENT_VERSION,
      });
    }

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        if (!recipientFieldIds.has(field.id)) {
          return res.status(403).json({ 
            message: "You can only update fields assigned to you" 
          });
        }
      }
    }

    for (const rf of recipientFields) {
      if (rf.required && rf.type !== "SIGNATURE" && rf.type !== "CHECKBOX") {
        const submittedField = fields?.find((f: any) => f.id === rf.id);
        if (!submittedField?.value && !rf.value) {
          if (rf.type === "NAME" || rf.type === "EMAIL" || rf.type === "DATE_SIGNED") {
            continue;
          }
          return res.status(400).json({ 
            message: `Please fill in all required fields before signing` 
          });
        }
      }
    }

    const signedAt = new Date();
    const consentRecord = createConsentRecord(ipAddress, userAgent, "BOTH");
    
    let documentContent: string;
    try {
      const fileUrl = await getFile({ 
        type: document.storageType, 
        data: document.file 
      });
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      documentContent = Buffer.from(buffer).toString("base64");
    } catch (error) {
      console.error("Failed to fetch document for checksum:", error);
      documentContent = document.file;
    }
    
    const signatureChecksum = createSignatureChecksum(
      recipient.id,
      document.id,
      documentContent,
      signedAt,
      ipAddress
    );

    let encryptedSignatureData: string | null = null;
    if (signatureImage) {
      try {
        const { storedValue, checksum } = await getEncryptedSignatureForStorage(
          signatureImage,
          document.id,
          recipient.id
        );
        encryptedSignatureData = storedValue;
        console.log(`[SECURITY] Signature encrypted with checksum: ${checksum.substring(0, 16)}...`);
      } catch (encryptError) {
        console.error("Failed to encrypt signature, storing unencrypted:", encryptError);
        encryptedSignatureData = signatureImage;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (fields && Array.isArray(fields)) {
        for (const field of fields) {
          if (recipientFieldIds.has(field.id)) {
            await tx.signatureField.update({
              where: { id: field.id },
              data: {
                value: field.value,
                filledAt: new Date(),
              },
            });
          }
        }
      }

      await tx.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "SIGNED",
          signedAt,
          signatureImage: encryptedSignatureData,
          ipAddress,
          userAgent,
          consentRecord: consentRecord as any,
          signatureChecksum: signatureChecksum as any,
        },
      });

      const allRecipients = await tx.signatureRecipient.findMany({
        where: { documentId: document.id },
      });

      const signersAndApprovers = allRecipients.filter(
        (r) => r.role === "SIGNER" || r.role === "APPROVER"
      );
      
      const allSigned = signersAndApprovers.every((r) => r.status === "SIGNED");
      const hasDeclined = allRecipients.some((r) => r.status === "DECLINED");

      let newStatus = document.status;
      if (allSigned && !hasDeclined) {
        newStatus = "COMPLETED";
        await tx.signatureDocument.update({
          where: { id: document.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      } else if (!hasDeclined) {
        const signedCount = allRecipients.filter((r) => r.status === "SIGNED").length;
        if (signedCount > 0) {
          newStatus = "PARTIALLY_SIGNED";
          await tx.signatureDocument.update({
            where: { id: document.id },
            data: { status: "PARTIALLY_SIGNED" },
          });
        }
      }

      return { allSigned, newStatus, allRecipients };
    });

    logSignatureEvent(req, {
      documentId: document.id,
      event: "recipient.signed",
      recipientId: recipient.id,
      recipientEmail: recipient.email,
    }).catch(console.error);

    onRecipientSigned({
      documentId: document.id,
      documentTitle: document.title,
      teamId: document.teamId,
      teamName: document.team.name,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      ipAddress,
      userAgent,
    }).catch(console.error);

    if (result.allSigned && result.newStatus === "COMPLETED") {
      logSignatureEvent(req, {
        documentId: document.id,
        event: "document.completed",
        metadata: { signerCount: result.allRecipients.filter((r) => r.status === "SIGNED").length },
      }).catch(console.error);

      processDocumentCompletion(document.id, {
        encrypt: true,
        generatePassword: true,
      }).then((encryptionResult) => {
        if (encryptionResult.success && encryptionResult.encryptedDocument) {
          console.log(`[SECURITY] Document ${document.id} encrypted successfully`);
        } else if (!encryptionResult.success) {
          console.error(`[SECURITY] Document encryption failed: ${encryptionResult.error}`);
        }
      }).catch((err) => {
        console.error("[SECURITY] Document encryption error:", err);
      });

      const completedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const signersList = result.allRecipients
        .filter((r) => r.status === "SIGNED")
        .map((r) => `${r.name} (${r.email})`);

      const baseUrl = process.env.NEXTAUTH_URL;

      const emailPromises: Promise<any>[] = [];

      for (const r of result.allRecipients) {
        emailPromises.push(
          sendEmail({
            to: r.email,
            subject: `Completed: ${document.title}`,
            react: SignatureCompletedEmail({
              recipientName: r.name,
              documentTitle: document.title,
              teamName: document.team.name,
              completedAt,
              signersList,
            }),
          }).catch((err) => {
            console.error(`Failed to send completion email to ${r.email}:`, err);
          })
        );
      }

      if (document.owner?.email) {
        emailPromises.push(
          sendEmail({
            to: document.owner.email,
            subject: `Document Completed: ${document.title}`,
            react: SignatureCompletedEmail({
              recipientName: document.owner.name || "Document Owner",
              documentTitle: document.title,
              teamName: document.team.name,
              completedAt,
              signersList,
              documentUrl: baseUrl ? `${baseUrl}/sign/${document.id}` : undefined,
            }),
          }).catch((err) => {
            console.error(`Failed to send completion email to owner:`, err);
          })
        );
      }

      await Promise.all(emailPromises);

      // Store completed document in LP vaults for signers only
      try {
        const signers = result.allRecipients.filter(
          (r) => r.role === "SIGNER" && r.status === "SIGNED"
        );
        
        for (const r of signers) {
          // Find investor by email
          const investor = await prisma.investor.findFirst({
            where: {
              user: { email: r.email },
            },
          });

          if (investor && document.file) {
            // Upsert to LP vault (prevents duplicates)
            await prisma.investorDocument.upsert({
              where: {
                investorId_signatureDocumentId: {
                  investorId: investor.id,
                  signatureDocumentId: document.id,
                },
              },
              update: {
                signedAt: new Date(),
                ipAddress: r.ipAddress || null,
                userAgent: r.userAgent || null,
                auditTrail: document.auditTrail as any,
              },
              create: {
                investorId: investor.id,
                title: document.title,
                documentType: document.title.toLowerCase().includes("nda")
                  ? "NDA"
                  : document.title.toLowerCase().includes("subscription")
                  ? "SUBSCRIPTION"
                  : "OTHER",
                storageKey: document.file,
                storageType: document.storageType,
                signatureDocumentId: document.id,
                signedAt: new Date(),
                ipAddress: r.ipAddress || null,
                userAgent: r.userAgent || null,
                auditTrail: document.auditTrail as any,
              },
            });
          }
        }
      } catch (lpError) {
        console.error("Failed to store document in LP vault:", lpError);
      }

      // Process subscription completion - update Subscription and Fund.currentRaise
      if (document.documentType === "SUBSCRIPTION" && document.subscriptionAmount) {
        try {
          const subscription = await prisma.subscription.findUnique({
            where: { signatureDocumentId: document.id },
          });

          if (subscription && subscription.status !== "SIGNED") {
            const signerInfo = result.allRecipients.find(
              (r) => r.role === "SIGNER" && r.status === "SIGNED"
            );

            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: "SIGNED",
                signedAt: new Date(),
                ipAddress: signerInfo?.ipAddress || null,
                userAgent: signerInfo?.userAgent || null,
              },
            });

            // Update fund currentRaise if linked to a fund
            if (subscription.fundId) {
              await prisma.fund.update({
                where: { id: subscription.fundId },
                data: {
                  currentRaise: {
                    increment: subscription.amount,
                  },
                },
              });

              // Check if threshold was just reached and send notification (atomic to prevent duplicates)
              try {
                const { checkAndMarkThresholdReached } = await import("@/lib/funds/threshold");
                const thresholdCheck = await checkAndMarkThresholdReached(subscription.fundId);
                
                if (thresholdCheck.shouldNotify && thresholdCheck.fund) {
                  const fundWithTeam = await prisma.fund.findUnique({
                    where: { id: subscription.fundId },
                    include: { team: { include: { users: { include: { user: true } } } } },
                  });

                  if (fundWithTeam) {
                    const { sendEmail } = await import("@/lib/resend");
                    const gpEmails = fundWithTeam.team.users
                      .filter((ut) => ["ADMIN", "OWNER"].includes(ut.role))
                      .map((ut) => ut.user.email)
                      .filter(Boolean) as string[];

                    for (const email of gpEmails) {
                      await sendEmail({
                        to: email,
                        subject: `${fundWithTeam.name} has reached capital call threshold`,
                        react: CapitalCallThresholdEmail({
                          fundName: fundWithTeam.name,
                          currentRaise: `$${Number(fundWithTeam.currentRaise).toLocaleString()}`,
                          threshold: `$${Number(fundWithTeam.capitalCallThreshold).toLocaleString()}`,
                        }),
                      }).catch(() => {});
                    }
                  }
                }
              } catch (thresholdError) {
                console.error("Failed to check/notify threshold:", thresholdError);
              }

              // Create or update Investment record
              const investor = await prisma.investor.findFirst({
                where: {
                  user: { email: result.allRecipients.find((r) => r.role === "SIGNER")?.email },
                },
              });

              if (investor) {
                await prisma.investment.upsert({
                  where: {
                    fundId_investorId: {
                      fundId: subscription.fundId,
                      investorId: investor.id,
                    },
                  },
                  update: {
                    commitmentAmount: {
                      increment: subscription.amount,
                    },
                    subscriptionDate: new Date(),
                  },
                  create: {
                    fundId: subscription.fundId,
                    investorId: investor.id,
                    commitmentAmount: subscription.amount,
                    fundedAmount: 0,
                    status: "COMMITTED",
                    subscriptionDate: new Date(),
                  },
                });
              }
            }
          }
        } catch (subError) {
          console.error("Failed to process subscription completion:", subError);
        }
      }

      onDocumentCompleted({
        documentId: document.id,
        documentTitle: document.title,
        teamId: document.teamId,
        teamName: document.team.name,
        allRecipients: result.allRecipients.map((r) => ({
          name: r.name,
          email: r.email,
          status: r.status,
          signedAt: r.signedAt?.toISOString() || null,
        })),
      }).catch(console.error);
    } else {
      const owner = await prisma.user.findFirst({
        where: { id: document.createdById },
        select: { name: true },
      });
      await sendToNextSigners(
        document.id,
        document.team.name,
        owner?.name || "BF Fund"
      );
    }

    return res.status(200).json({
      message: "Document signed successfully",
      status: result.newStatus,
    });
  } catch (error) {
    reportError(error, {
      path: '/api/sign/[token]',
      action: 'process_signature',
      method: 'POST',
    });
    console.error("Error processing signature:", error);
    return res.status(500).json({ message: "Failed to process signature" });
  }
}
