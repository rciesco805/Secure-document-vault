import { DocumentStorageType } from "@prisma/client";
import { match } from "ts-pattern";

export type GetFileOptions = {
  type: DocumentStorageType;
  data: string;
  isDownload?: boolean;
};

export const getFile = async ({
  type,
  data,
  isDownload = false,
}: GetFileOptions): Promise<string> => {
  const url = await match(type)
    .with(DocumentStorageType.VERCEL_BLOB, async () => {
      // For Vercel Blob, just return the URL directly
      // Download URLs require ?download=1 query param for public blobs
      if (isDownload && data.includes("blob.vercel-storage.com")) {
        const downloadUrl = new URL(data);
        downloadUrl.searchParams.set("download", "1");
        return downloadUrl.toString();
      }
      return data;
    })
    .with(DocumentStorageType.S3_PATH, async () => {
      // Check if this is a Replit Object Storage path
      if (data.startsWith("/objects/")) {
        return getFileFromReplit(data);
      }
      return getFileFromS3(data);
    })
    .exhaustive();

  return url;
};

// Parse Replit Object Storage path into bucket and object name
function parseReplitObjectPath(path: string): {
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

// Direct call to Replit sidecar for server-side file access
async function getSignedUrlFromSidecar(key: string): Promise<string> {
  const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://127.0.0.1:1106";
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
  const { bucketName, objectName } = parseReplitObjectPath(fullPath);

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

const fetchPresignedUrl = async (
  endpoint: string,
  headers: Record<string, string>,
  key: string,
): Promise<string> => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let errorMessage: string;

    if (contentType && contentType.includes("application/json")) {
      try {
        const error = await response.json();
        errorMessage =
          error.message || `Request failed with status ${response.status}`;
      } catch (parseError) {
        const textError = await response.text();
        errorMessage =
          textError || `Request failed with status ${response.status}`;
      }
    } else {
      const textError = await response.text();
      errorMessage =
        textError || `Request failed with status ${response.status}`;
    }

    throw new Error(errorMessage);
  }

  const { url } = (await response.json()) as { url: string };
  return url;
};

const getFileFromS3 = async (key: string) => {
  const isServer =
    typeof window === "undefined" && !!process.env.INTERNAL_API_KEY;

  if (isServer) {
    return fetchPresignedUrl(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/file/s3/get-presigned-get-url`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      key,
    );
  } else {
    return fetchPresignedUrl(
      `/api/file/s3/get-presigned-get-url-proxy`,
      {
        "Content-Type": "application/json",
      },
      key,
    );
  }
};

const getFileFromReplit = async (key: string) => {
  const isServer = typeof window === "undefined";

  if (isServer) {
    // Server-side: directly call the Replit sidecar without needing INTERNAL_API_KEY
    return getSignedUrlFromSidecar(key);
  } else {
    // Client-side: use the proxy endpoint which handles team authorization
    return fetchPresignedUrl(
      `/api/file/replit-get-proxy`,
      {
        "Content-Type": "application/json",
      },
      key,
    );
  }
};
