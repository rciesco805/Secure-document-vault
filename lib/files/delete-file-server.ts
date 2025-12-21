import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { DocumentStorageType } from "@prisma/client";
import { match } from "ts-pattern";

import { getTeamS3ClientAndConfig } from "./aws-client";

export type DeleteFileOptions = {
  type: DocumentStorageType;
  data: string; // url for vercel, folderpath for s3
  teamId: string; // needed to resolve storage region
};

export const deleteFile = async ({ type, data, teamId }: DeleteFileOptions) => {
  const uploadTransport = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;
  
  return await match(type)
    .with(DocumentStorageType.S3_PATH, async () => {
      // Only attempt S3 deletion if we're configured for S3
      // Otherwise skip (file may be on Replit Object Storage or old S3)
      if (uploadTransport === "s3") {
        return deleteAllFilesFromS3Server(data, teamId);
      }
      console.log("Skipping S3 deletion (not configured for S3):", data);
      return;
    })
    .with(DocumentStorageType.VERCEL_BLOB, async () =>
      deleteFileFromVercelServer(data),
    )
    .otherwise(() => {
      return;
    });
};

const deleteFileFromVercelServer = async (url: string) => {
  // Skip all Vercel Blob deletion attempts - files are either:
  // 1. Already migrated to Replit Object Storage
  // 2. On old Vercel account we no longer have access to
  // The database record will still be deleted, which is what matters
  console.log("Skipping Vercel Blob deletion (not configured):", url);
  return;
};

const deleteAllFilesFromS3Server = async (data: string, teamId: string) => {
  // get docId from url with starts with "doc_" with regex
  const dataMatch = data.match(/^(.*doc_[^\/]+)\//);
  const folderPath = dataMatch ? dataMatch[1] : data;

  const { client, config } = await getTeamS3ClientAndConfig(teamId);

  try {
    // List all objects in the folder
    const listParams = {
      Bucket: config.bucket,
      Prefix: `${folderPath}/`, // Ensure this ends with a slash if it's a folder
    };
    const listedObjects = await client.send(
      new ListObjectsV2Command(listParams),
    );

    if (!listedObjects.Contents) return;
    if (listedObjects.Contents.length === 0) return;

    // Prepare delete parameters
    const deleteParams = {
      Bucket: config.bucket,
      Delete: {
        Objects: listedObjects.Contents.map((file) => ({ Key: file.Key })),
      },
    };

    // Delete the objects
    await client.send(new DeleteObjectsCommand(deleteParams));

    if (listedObjects.IsTruncated) {
      // If there are more files than returned in a single request, recurse
      await deleteAllFilesFromS3Server(folderPath, teamId);
    }
  } catch (error) {
    console.error("Error deleting files:", error);
  }
};
