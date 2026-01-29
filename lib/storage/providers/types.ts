import type { Readable } from "stream";

export type StorageProviderType = "replit" | "s3" | "r2" | "local";

export interface StorageUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  encrypt?: boolean;
}

export interface StorageDownloadOptions {
  decrypt?: boolean;
}

export interface StorageSignedUrlOptions {
  expiresIn?: number;
  method?: "GET" | "PUT" | "DELETE" | "HEAD";
  contentType?: string;
}

export interface StorageListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface StorageListResult {
  keys: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface StorageObjectInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  readonly type: StorageProviderType;
  
  put(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: StorageUploadOptions
  ): Promise<{ key: string; hash: string }>;
  
  putStream(
    key: string,
    stream: Readable,
    options?: StorageUploadOptions
  ): Promise<{ key: string; hash: string }>;
  
  get(
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Buffer | null>;
  
  getStream(
    key: string,
    options?: StorageDownloadOptions
  ): Promise<Readable | null>;
  
  delete(key: string): Promise<boolean>;
  
  exists(key: string): Promise<boolean>;
  
  list(options?: StorageListOptions): Promise<StorageListResult>;
  
  getInfo(key: string): Promise<StorageObjectInfo | null>;
  
  getSignedUrl(
    key: string,
    options?: StorageSignedUrlOptions
  ): Promise<string>;
  
  copy(sourceKey: string, destKey: string): Promise<boolean>;
}

export interface StorageConfig {
  provider: StorageProviderType;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localPath?: string;
  encryptionKey?: string;
}
