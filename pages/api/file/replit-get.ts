import type { NextApiRequest, NextApiResponse } from "next";

import { log } from "@/lib/utils";

const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://127.0.0.1:1106";

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

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

  return {
    bucketName,
    objectName,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Authentication: Only accept INTERNAL_API_KEY (server-side calls)
    // Client calls must go through the proxy endpoint for team authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.split(" ")[1];
    if (!process.env.INTERNAL_API_KEY) {
      log({
        message: "INTERNAL_API_KEY environment variable is not set",
        type: "error",
      });
      return res.status(500).json({ error: "Server configuration error" });
    }
    if (token !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Missing required field: key" });
    }

    const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateObjectDir) {
      return res.status(500).json({
        error: "PRIVATE_OBJECT_DIR not configured",
      });
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

    const signedUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec: 3600,
    });

    return res.status(200).json({ url: signedUrl });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }
}
