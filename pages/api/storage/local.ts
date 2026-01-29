import type { NextApiRequest, NextApiResponse } from "next";
import { getStorageProvider, getStorageConfig } from "@/lib/storage/providers";
import { LocalStorageProvider } from "@/lib/storage/providers/local-provider";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const config = getStorageConfig();
  
  if (config.provider !== "local") {
    return res.status(404).json({ error: "Local storage not configured" });
  }

  const { key, method, expires, sig } = req.query;

  if (
    typeof key !== "string" ||
    typeof method !== "string" ||
    typeof expires !== "string" ||
    typeof sig !== "string"
  ) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const provider = getStorageProvider();
  
  if (!(provider instanceof LocalStorageProvider)) {
    return res.status(500).json({ error: "Storage provider mismatch" });
  }

  const isValid = provider.verifySignedUrl(key, method, expires, sig);
  
  if (!isValid) {
    return res.status(403).json({ error: "Invalid or expired signature" });
  }

  const actualMethod = req.method || "GET";
  const methodMap: Record<string, string[]> = {
    GET: ["GET"],
    PUT: ["PUT", "POST"],
    DELETE: ["DELETE"],
    HEAD: ["HEAD", "GET"],
  };

  const allowedMethods = methodMap[method];
  if (!allowedMethods || !allowedMethods.includes(actualMethod)) {
    return res.status(405).json({ 
      error: `Method mismatch: signed for ${method}, received ${actualMethod}` 
    });
  }

  try {
    switch (method) {
      case "GET": {
        const data = await provider.get(key);
        if (!data) {
          return res.status(404).json({ error: "File not found" });
        }
        
        const info = await provider.getInfo(key);
        if (info?.contentType) {
          res.setHeader("Content-Type", info.contentType);
        }
        res.setHeader("Content-Length", data.length);
        return res.send(data);
      }
      
      case "PUT": {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks);
        
        await provider.put(key, body, {
          contentType: req.headers["content-type"] as string,
        });
        
        return res.status(200).json({ success: true });
      }
      
      case "DELETE": {
        const deleted = await provider.delete(key);
        if (!deleted) {
          return res.status(404).json({ error: "File not found" });
        }
        return res.status(200).json({ success: true });
      }
      
      case "HEAD": {
        const exists = await provider.exists(key);
        if (!exists) {
          return res.status(404).end();
        }
        
        const info = await provider.getInfo(key);
        if (info) {
          res.setHeader("Content-Length", info.size);
          if (info.contentType) {
            res.setHeader("Content-Type", info.contentType);
          }
          res.setHeader("Last-Modified", info.lastModified.toUTCString());
        }
        return res.status(200).end();
      }
      
      default:
        return res.status(400).json({ error: "Invalid method" });
    }
  } catch (error) {
    console.error("Local storage API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
