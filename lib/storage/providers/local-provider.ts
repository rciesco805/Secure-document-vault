import type { Readable } from "stream";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
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

export class LocalStorageProvider implements StorageProvider {
  readonly type = "local" as const;
  private readonly basePath: string;
  private readonly encryptionEnabled: boolean;
  private readonly signedUrlSecret: string;

  constructor(config: StorageConfig) {
    this.basePath = path.resolve(config.localPath || "./.storage");
    this.encryptionEnabled = !!config.encryptionKey;
    this.signedUrlSecret = config.encryptionKey || crypto.randomBytes(32).toString("hex");
    
    if (!fsSync.existsSync(this.basePath)) {
      fsSync.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getFullPath(key: string): string {
    const sanitizedKey = key.replace(/^\/+/, "").replace(/\.\./g, "");
    return path.join(this.basePath, sanitizedKey);
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
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
    
    await this.ensureDir(fullPath);
    await fs.writeFile(fullPath, contentBuffer);

    if (options?.metadata || options?.contentType) {
      const metaPath = `${fullPath}.meta.json`;
      await fs.writeFile(metaPath, JSON.stringify({
        contentType: options?.contentType,
        metadata: options?.metadata,
        createdAt: new Date().toISOString(),
      }));
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
      const fullPath = this.getFullPath(key);
      let data: Buffer = await fs.readFile(fullPath);

      if (options?.decrypt && this.encryptionEnabled) {
        const cryptoService = getCryptoService();
        data = cryptoService.decryptFromBuffer(data);
      }

      return data;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      console.error("Error reading local file:", error);
      throw error;
    }
  }

  async getStream(
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Readable | null> {
    const fullPath = this.getFullPath(key);
    
    try {
      await fs.access(fullPath);
    } catch {
      return null;
    }

    if (options?.decrypt && this.encryptionEnabled) {
      const data = await this.get(key, options);
      if (!data) return null;
      const { Readable: ReadableStream } = await import("stream");
      return ReadableStream.from([data]);
    }

    return fsSync.createReadStream(fullPath);
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.unlink(fullPath);
      
      const metaPath = `${fullPath}.meta.json`;
      try {
        await fs.unlink(metaPath);
      } catch {
      }
      
      return true;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return true;
      }
      console.error("Error deleting local file:", error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(options?: StorageListOptions): Promise<StorageListResult> {
    try {
      const searchPath = options?.prefix 
        ? path.join(this.basePath, options.prefix)
        : this.basePath;

      const keys: string[] = [];
      
      const walkDir = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walkDir(fullPath);
            } else if (!entry.name.endsWith(".meta.json")) {
              const relativePath = path.relative(this.basePath, fullPath);
              keys.push(relativePath.replace(/\\/g, "/"));
            }
          }
        } catch {
        }
      };

      await walkDir(searchPath);

      const sortedKeys = keys.sort();
      const limitedKeys = options?.maxKeys 
        ? sortedKeys.slice(0, options.maxKeys)
        : sortedKeys;

      return {
        keys: limitedKeys,
        isTruncated: options?.maxKeys ? keys.length > options.maxKeys : false,
      };
    } catch (error) {
      console.error("Error listing local files:", error);
      return { keys: [], isTruncated: false };
    }
  }

  async getInfo(key: string): Promise<StorageObjectInfo | null> {
    try {
      const fullPath = this.getFullPath(key);
      const stats = await fs.stat(fullPath);
      
      let contentType: string | undefined;
      let metadata: Record<string, string> | undefined;
      
      try {
        const metaPath = `${fullPath}.meta.json`;
        const metaContent = await fs.readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaContent);
        contentType = meta.contentType;
        metadata = meta.metadata;
      } catch {
      }

      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        contentType,
        metadata,
      };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async getSignedUrl(
    key: string,
    options?: StorageSignedUrlOptions
  ): Promise<string> {
    const expiresIn = options?.expiresIn || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;
    const method = options?.method || "GET";
    
    const payload = `${key}:${method}:${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", this.signedUrlSecret)
      .update(payload)
      .digest("hex");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000";
    const params = new URLSearchParams({
      key,
      method,
      expires: String(expiresAt),
      sig: signature,
    });

    return `${baseUrl}/api/storage/local?${params.toString()}`;
  }

  verifySignedUrl(key: string, method: string, expires: string, signature: string): boolean {
    const expiresAt = parseInt(expires, 10);
    if (Date.now() > expiresAt) {
      return false;
    }

    const payload = `${key}:${method}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.signedUrlSecret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }

  async copy(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      const sourcePath = this.getFullPath(sourceKey);
      const destPath = this.getFullPath(destKey);
      
      await this.ensureDir(destPath);
      await fs.copyFile(sourcePath, destPath);

      try {
        const sourceMetaPath = `${sourcePath}.meta.json`;
        const destMetaPath = `${destPath}.meta.json`;
        await fs.copyFile(sourceMetaPath, destMetaPath);
      } catch {
      }

      return true;
    } catch (error) {
      console.error("Error copying local file:", error);
      return false;
    }
  }
}
