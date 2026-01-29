import type { DataStore } from "@tus/server";
import { getStorageConfig } from "./providers";
import type { StorageProviderType } from "./providers/types";

export interface TusStoreConfig {
  provider?: StorageProviderType;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localPath?: string;
}

export async function createTusStore(config?: TusStoreConfig): Promise<DataStore> {
  const storageConfig = config || getStorageConfig();
  const provider = storageConfig.provider || "replit";

  switch (provider) {
    case "s3":
    case "r2": {
      const { S3Store } = await import("@tus/s3-store");
      const { S3 } = await import("@aws-sdk/client-s3");
      
      if (!storageConfig.bucket) {
        throw new Error("S3 bucket is required for TUS S3 store");
      }

      const s3Config: any = {
        region: storageConfig.region || "us-east-1",
      };

      if (storageConfig.endpoint) {
        s3Config.endpoint = storageConfig.endpoint;
        if (provider === "r2") {
          s3Config.forcePathStyle = true;
        }
      }

      if (storageConfig.accessKeyId && storageConfig.secretAccessKey) {
        s3Config.credentials = {
          accessKeyId: storageConfig.accessKeyId,
          secretAccessKey: storageConfig.secretAccessKey,
        };
      }

      return new S3Store({
        partSize: 8 * 1024 * 1024,
        s3ClientConfig: {
          bucket: storageConfig.bucket,
          ...s3Config,
        },
      });
    }

    case "local": {
      const { FileStore } = await import("@tus/file-store");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.resolve(storageConfig.localPath || "./.storage", "tus-uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      return new FileStore({
        directory: uploadDir,
      });
    }

    case "replit":
    default: {
      const { MultiRegionS3Store } = await import("@/ee/features/storage/s3-store");
      return new MultiRegionS3Store();
    }
  }
}

export async function createTeamTusStore(teamId: string): Promise<DataStore> {
  const config = getStorageConfig();
  
  if (config.provider === "s3" || config.provider === "r2") {
    const { getTeamStorageConfigById } = await import("@/ee/features/storage/config");
    const teamConfig = await getTeamStorageConfigById(teamId);
    
    const { S3Store } = await import("@tus/s3-store");
    const s3Config: any = {
      region: teamConfig.region,
    };

    if (teamConfig.endpoint) {
      s3Config.endpoint = teamConfig.endpoint;
    }

    if (teamConfig.accessKeyId && teamConfig.secretAccessKey) {
      s3Config.credentials = {
        accessKeyId: teamConfig.accessKeyId,
        secretAccessKey: teamConfig.secretAccessKey,
      };
    }

    return new S3Store({
      partSize: 8 * 1024 * 1024,
      s3ClientConfig: {
        bucket: teamConfig.bucket,
        ...s3Config,
      },
    });
  }

  return createTusStore();
}
