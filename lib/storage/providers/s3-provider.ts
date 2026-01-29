import type { Readable } from "stream";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export class S3StorageProvider implements StorageProvider {
  readonly type: "s3" | "r2";
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly encryptionEnabled: boolean;

  constructor(config: StorageConfig) {
    this.type = config.provider === "r2" ? "r2" : "s3";
    
    if (!config.bucket) {
      throw new Error("S3 bucket is required");
    }
    this.bucket = config.bucket;
    this.encryptionEnabled = !!config.encryptionKey;

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: config.region || "us-east-1",
    };

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      if (config.provider === "r2") {
        clientConfig.forcePathStyle = true;
      }
    }

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
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

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: contentBuffer,
      ContentType: options?.contentType || "application/octet-stream",
      Metadata: options?.metadata,
    });

    await this.client.send(command);
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
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      if (!response.Body) {
        return null;
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;
      for await (const chunk of stream) {
        chunks.push(new Uint8Array(chunk));
      }
      let data: Buffer = Buffer.concat(chunks);

      if (options?.decrypt && this.encryptionEnabled) {
        const cryptoService = getCryptoService();
        data = cryptoService.decryptFromBuffer(data);
      }

      return data;
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error("Error downloading from S3:", error);
      throw error;
    }
  }

  async getStream(
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Readable | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      if (!response.Body) {
        return null;
      }

      if (options?.decrypt && this.encryptionEnabled) {
        const data = await this.get(key, options);
        if (!data) return null;
        const { Readable: ReadableStream } = await import("stream");
        return ReadableStream.from([data]);
      }

      return response.Body as Readable;
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error("Error streaming from S3:", error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error("Error deleting from S3:", error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async list(options?: StorageListOptions): Promise<StorageListResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys,
        ContinuationToken: options?.continuationToken,
      });

      const response = await this.client.send(command);
      
      return {
        keys: (response.Contents || []).map(obj => obj.Key!).filter(Boolean),
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      console.error("Error listing S3 objects:", error);
      return { keys: [], isTruncated: false };
    }
  }

  async getInfo(key: string): Promise<StorageObjectInfo | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      
      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async getSignedUrl(
    key: string,
    options?: StorageSignedUrlOptions
  ): Promise<string> {
    const method = options?.method || "GET";
    const expiresIn = options?.expiresIn || 3600;

    let command;
    switch (method) {
      case "PUT":
        command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: options?.contentType,
        });
        break;
      case "DELETE":
        command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        break;
      case "HEAD":
        command = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        break;
      case "GET":
      default:
        command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        break;
    }

    return getSignedUrl(this.client, command as any, { expiresIn });
  }

  async copy(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error("Error copying S3 object:", error);
      return false;
    }
  }
}
