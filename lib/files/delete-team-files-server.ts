import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { getTeamS3ClientAndConfig } from "./aws-client";

export type DeleteFilesOptions = {
  teamId: string;
  data?: string[]; // urls for vercel (ignored - not configured)
};

export const deleteFiles = async ({ teamId, data }: DeleteFilesOptions) => {
  // Only delete from S3/Replit storage - Vercel Blob not configured
  if (data && data.length > 0) {
    console.log("Skipping Vercel Blob deletion (not configured):", data.length, "files");
  }
  await deleteAllFilesFromS3Server(teamId);
};

const deleteAllFilesFromS3Server = async (teamId: string) => {
  // the teamId is the first prefix in the folder path
  const folderPath = teamId;

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
      await deleteAllFilesFromS3Server(folderPath);
    }
  } catch (error) {
    console.error("Error deleting files:", error);
  }
};
