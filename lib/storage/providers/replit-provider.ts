import type { Readable } from "stream";
import crypto from "crypto";
import type {
  StorageProvider,
  StorageConfig,
  StorageUploadOptions,
  StorageDownloadOptions,
  StorageSignedUrlOptions,
  StorageListOptions,
  StorageListResult,
  StorageObjectInfo,
} from "./types";
import { getCryptoService } from "../encryption/crypto-service";

const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://127.0.0.1:1106";

interface SignedUrlRequest {
  bucket_name: string;
  object_name: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  expires_at: string;
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  let normalizedPath = path;
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }
  const pathParts = normalizedPath.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name and object name");
  }
  return {
    bucketName: pathParts[1],
    objectName: pathParts.slice(2).join("/"),
  };
}

export class ReplitStorageProvider implements StorageProvider {
  readonly type = "replit" as const;
  private readonly privateObjectDir: string;
  private readonly encryptionEnabled: boolean;

  constructor(config: StorageConfig) {
    this.privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "/objects";
    this.encryptionEnabled = !!config.encryptionKey;
  }

  private getFullPath(key: string): string {
    if (key.startsWith("/objects/") || key.startsWith("objects/")) {
      return key.startsWith("/") ? key : `/${key}`;
    }
    
    let dir = this.privateObjectDir;
    if (!dir.endsWith("/")) {
      dir = `${dir}/`;
    }
    return `${dir}${key}`;
  }

  private async signObjectUrl(params: SignedUrlRequest): Promise<string> {
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Failed to sign object URL: ${response.status} - ${errorText}`);
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  async put(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: StorageUploadOptions
  ): Promise<{ key: string; hash: string }> {
    let contentBuffer: Buffer = typeof data === "string" 
      ? Buffer.from(data, "utf-8") 
      : Buffer.from(data as Uint8Array);

    if (options?.encrypt && this.encryptionEnabled) {
      const cryptoService = getCryptoService();
      contentBuffer = cryptoService.encryptToBuffer(contentBuffer);
    }

    const hash = crypto.createHash("sha256").update(contentBuffer).digest("hex");
    const fullPath = this.getFullPath(key);
    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadUrl = await this.signObjectUrl({
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(contentBuffer),
      headers: {
        "Content-Type": options?.contentType || "application/octet-stream",
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to Replit storage: ${uploadResponse.status}`);
    }

    return { key, hash };
  }

  async putStream(
    key: string,
    stream: Readable,
    options?: StorageUploadOptions
  ): Promise<{ key: string; hash: string }> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return this.put(key, Buffer.concat(chunks), options);
  }

  async get(
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Buffer | null> {
    try {
      const signedUrl = await this.getSignedUrl(key, { method: "GET" });
      
      const response = await fetch(signedUrl);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to download from Replit storage: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      let data: Buffer = Buffer.from(new Uint8Array(arrayBuffer));

      if (options?.decrypt && this.encryptionEnabled) {
        const cryptoService = getCryptoService();
        data = cryptoService.decryptFromBuffer(data);
      }

      return data;
    } catch (error) {
      console.error("Error downloading from Replit storage:", error);
      return null;
    }
  }

  async getStream(
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Readable | null> {
    const data = await this.get(key, options);
    if (!data) return null;

    const { Readable: ReadableStream } = await import("stream");
    return ReadableStream.from([data]);
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const signedUrl = await this.signObjectUrl({
        bucket_name: bucketName,
        object_name: objectName,
        method: "DELETE",
        expires_at: new Date(Date.now() + 300 * 1000).toISOString(),
      });

      const response = await fetch(signedUrl, { method: "DELETE" });
      return response.ok || response.status === 404;
    } catch (error) {
      console.error("Error deleting from Replit storage:", error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const signedUrl = await this.signObjectUrl({
        bucket_name: bucketName,
        object_name: objectName,
        method: "HEAD",
        expires_at: new Date(Date.now() + 300 * 1000).toISOString(),
      });

      const response = await fetch(signedUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async list(options?: StorageListOptions): Promise<StorageListResult> {
    try {
      const { Client } = await import("@replit/object-storage");
      const client = new Client();
      
      const result = await client.list({ prefix: options?.prefix || "" });
      
      if (!result.ok) {
        return { keys: [], isTruncated: false };
      }

      const keys = (result.value as unknown as Array<{ key: string }>).map(obj => obj.key);
      const limitedKeys = options?.maxKeys ? keys.slice(0, options.maxKeys) : keys;
      
      return {
        keys: limitedKeys,
        isTruncated: options?.maxKeys ? keys.length > options.maxKeys : false,
      };
    } catch (error) {
      console.error("Error listing Replit storage:", error);
      return { keys: [], isTruncated: false };
    }
  }

  async getInfo(key: string): Promise<StorageObjectInfo | null> {
    try {
      const fullPath = this.getFullPath(key);
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const signedUrl = await this.signObjectUrl({
        bucket_name: bucketName,
        object_name: objectName,
        method: "HEAD",
        expires_at: new Date(Date.now() + 300 * 1000).toISOString(),
      });

      const response = await fetch(signedUrl, { method: "HEAD" });
      if (!response.ok) {
        return null;
      }

      return {
        key,
        size: parseInt(response.headers.get("content-length") || "0", 10),
        lastModified: new Date(response.headers.get("last-modified") || Date.now()),
        contentType: response.headers.get("content-type") || undefined,
      };
    } catch {
      return null;
    }
  }

  async getSignedUrl(
    key: string,
    options?: StorageSignedUrlOptions
  ): Promise<string> {
    const fullPath = this.getFullPath(key);
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const expiresIn = options?.expiresIn || 3600;

    return this.signObjectUrl({
      bucket_name: bucketName,
      object_name: objectName,
      method: options?.method || "GET",
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }

  async copy(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      const data = await this.get(sourceKey);
      if (!data) return false;

      await this.put(destKey, data);
      return true;
    } catch {
      return false;
    }
  }
}
