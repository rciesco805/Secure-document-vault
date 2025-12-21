import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../auth/[...nextauth]";

const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://127.0.0.1:1106";

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return { bucketName, objectName };
}

async function signObjectURL(key: string): Promise<string> {
  const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
  
  if (!privateObjectDir) {
    throw new Error("PRIVATE_OBJECT_DIR not configured");
  }

  let objectEntityDir = privateObjectDir;
  if (!objectEntityDir.endsWith("/")) {
    objectEntityDir = `${objectEntityDir}/`;
  }

  let entityPath = key;
  if (key.startsWith("/objects/")) {
    entityPath = key.slice("/objects/".length);
  }

  const fullPath = `${objectEntityDir}${entityPath}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method: "GET",
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  };

  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to sign object URL, errorcode: ${response.status}`);
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { key } = req.body as { key: string };

  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }

  try {
    const userId = (session.user as CustomUser).id;

    // Find the document/version that matches this file path
    // Replit storage paths: /objects/documents/{uuid}/{filename}
    const document = await prisma.document.findFirst({
      where: { file: key },
      select: { teamId: true },
    });

    const documentVersion = !document
      ? await prisma.documentVersion.findFirst({
          where: { file: key },
          select: { document: { select: { teamId: true } } },
        })
      : null;

    const teamId = document?.teamId || documentVersion?.document?.teamId;

    if (!teamId) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Verify user belongs to the team that owns this document
    const userTeam = await prisma.userTeam.findFirst({
      where: {
        userId,
        teamId,
      },
    });

    if (!userTeam) {
      return res
        .status(403)
        .json({ error: "Forbidden: You are not a member of this team" });
    }

    // Directly call the Replit sidecar to generate signed URL
    const url = await signObjectURL(key);
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Proxy error:", error);
    return errorhandler(error, res);
  }
}
