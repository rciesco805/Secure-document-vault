import type { StorageProvider, StorageConfig, StorageProviderType } from "./types";
import { ReplitStorageProvider } from "./replit-provider";
import { S3StorageProvider } from "./s3-provider";
import { LocalStorageProvider } from "./local-provider";

export * from "./types";

let cachedProvider: StorageProvider | null = null;
let cachedConfig: StorageConfig | null = null;

function getStorageConfigFromEnv(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 
    process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT || 
    "replit") as StorageProviderType;

  return {
    provider,
    bucket: process.env.STORAGE_BUCKET || process.env.NEXT_PRIVATE_UPLOAD_BUCKET,
    region: process.env.STORAGE_REGION || process.env.NEXT_PRIVATE_UPLOAD_REGION || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT || process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY,
    localPath: process.env.STORAGE_LOCAL_PATH || "./.storage",
    encryptionKey: process.env.STORAGE_ENCRYPTION_KEY || process.env.NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY,
  };
}

function configsEqual(a: StorageConfig | null, b: StorageConfig): boolean {
  if (!a) return false;
  return a.provider === b.provider &&
    a.bucket === b.bucket &&
    a.region === b.region &&
    a.endpoint === b.endpoint &&
    a.accessKeyId === b.accessKeyId &&
    a.secretAccessKey === b.secretAccessKey &&
    a.localPath === b.localPath &&
    a.encryptionKey === b.encryptionKey;
}

export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "replit":
      return new ReplitStorageProvider(config);
    case "s3":
    case "r2":
      return new S3StorageProvider(config);
    case "local":
      return new LocalStorageProvider(config);
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
}

export function getStorageProvider(): StorageProvider {
  const config = getStorageConfigFromEnv();
  
  if (!cachedProvider || !configsEqual(cachedConfig, config)) {
    cachedProvider = createStorageProvider(config);
    cachedConfig = config;
  }
  
  return cachedProvider;
}

export function getStorageConfig(): StorageConfig {
  return getStorageConfigFromEnv();
}

export function resetStorageProvider(): void {
  cachedProvider = null;
  cachedConfig = null;
}
