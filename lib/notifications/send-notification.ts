import webpush from "web-push";

import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@bermudafranchisegroup.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  url?: string;
}

export async function sendNotification({
  userId,
  type,
  title,
  body,
  data,
  url,
}: SendNotificationOptions) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
    },
  });

  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  const shouldSendPush = preferences
    ? checkPushPreference(preferences, type)
    : false;

  if (!shouldSendPush || !vapidPublicKey || !vapidPrivateKey) {
    return notification;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: {
      url: url || "/dashboard/notifications",
      notificationId: notification.id,
      ...data,
    },
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
      console.error("Push notification failed:", error);
    }
  });

  await Promise.allSettled(sendPromises);

  await prisma.notification.update({
    where: { id: notification.id },
    data: { sent: true },
  });

  return notification;
}

function checkPushPreference(
  preferences: any,
  type: NotificationType
): boolean {
  switch (type) {
    case "DOCUMENT_VIEWED":
      return preferences.pushDocumentViewed;
    case "SIGNATURE_COMPLETE":
    case "SIGNATURE_REQUESTED":
      return preferences.pushSignatureComplete;
    case "CAPITAL_CALL":
      return preferences.pushCapitalCall;
    case "DISTRIBUTION":
      return preferences.pushDistribution;
    case "NEW_DOCUMENT":
      return preferences.pushNewDocument;
    case "ACCREDITATION_UPDATE":
    case "SYSTEM":
      return true;
    default:
      return false;
  }
}

export async function notifyDocumentViewed({
  documentName,
  viewerEmail,
  viewerName,
  ownerId,
  documentId,
  linkId,
}: {
  documentName: string;
  viewerEmail?: string;
  viewerName?: string;
  ownerId: string;
  documentId: string;
  linkId?: string;
}) {
  const viewer = viewerName || viewerEmail || "Someone";
  return sendNotification({
    userId: ownerId,
    type: "DOCUMENT_VIEWED",
    title: "Document Viewed",
    body: `${viewer} viewed "${documentName}"`,
    data: { documentId, linkId, viewerEmail, viewerName },
    url: `/documents/${documentId}`,
  });
}

export async function notifySignatureComplete({
  documentName,
  signerEmail,
  signerName,
  ownerId,
  signatureDocumentId,
}: {
  documentName: string;
  signerEmail: string;
  signerName?: string;
  ownerId: string;
  signatureDocumentId: string;
}) {
  const signer = signerName || signerEmail;
  return sendNotification({
    userId: ownerId,
    type: "SIGNATURE_COMPLETE",
    title: "Signature Complete",
    body: `${signer} signed "${documentName}"`,
    data: { signatureDocumentId, signerEmail },
    url: `/signatures/${signatureDocumentId}`,
  });
}

export async function notifyCapitalCall({
  investorUserId,
  fundName,
  amount,
  dueDate,
  capitalCallId,
}: {
  investorUserId: string;
  fundName: string;
  amount: number;
  dueDate: string;
  capitalCallId: string;
}) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return sendNotification({
    userId: investorUserId,
    type: "CAPITAL_CALL",
    title: "Capital Call Notice",
    body: `${fundName}: ${formattedAmount} due by ${dueDate}`,
    data: { capitalCallId, fundName, amount },
    url: `/investor/capital-calls`,
  });
}

export async function notifyDistribution({
  investorUserId,
  fundName,
  amount,
  distributionId,
}: {
  investorUserId: string;
  fundName: string;
  amount: number;
  distributionId: string;
}) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return sendNotification({
    userId: investorUserId,
    type: "DISTRIBUTION",
    title: "Distribution Notice",
    body: `${fundName}: ${formattedAmount} distribution`,
    data: { distributionId, fundName, amount },
    url: `/investor/distributions`,
  });
}
