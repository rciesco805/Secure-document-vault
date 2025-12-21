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
  const isServer =
    typeof window === "undefined" && !!process.env.INTERNAL_API_KEY;

  if (isServer) {
    return fetchPresignedUrl(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/file/replit-get`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      key,
    );
  } else {
    return fetchPresignedUrl(
      `/api/file/replit-get-proxy`,
      {
        "Content-Type": "application/json",
      },
      key,
    );
  }
};
