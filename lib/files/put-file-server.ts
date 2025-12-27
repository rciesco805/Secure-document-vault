import { PutObjectCommand } from "@aws-sdk/client-s3";
import { DocumentStorageType } from "@prisma/client";
import slugify from "@sindresorhus/slugify";
import path from "node:path";
import { match } from "ts-pattern";

import { newId } from "@/lib/id-helper";

import { SUPPORTED_DOCUMENT_MIME_TYPES } from "../constants";
import { getTeamS3ClientAndConfig } from "./aws-client";

type File = {
  name: string;
  type: string;
  buffer: Buffer;
};

const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://127.0.0.1:1106";

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
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

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return {
    bucketName: pathParts[1],
    objectName: pathParts.slice(2).join("/"),
  };
}

export const putFileServer = async ({
  file,
  teamId,
  docId,
  restricted = true,
}: {
  file: File;
  teamId: string;
  docId?: string;
  restricted?: boolean;
}) => {
  const NEXT_PUBLIC_UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;

  const { type, data } = await match(NEXT_PUBLIC_UPLOAD_TRANSPORT)
    .with("s3", async () =>
      putFileInS3Server({ file, teamId, docId, restricted }),
    )
    .with("replit", async () =>
      putFileInReplitStorage({ file, teamId, docId, restricted }),
    )
    .otherwise(() => {
      console.error("Unsupported upload transport:", NEXT_PUBLIC_UPLOAD_TRANSPORT);
      return {
        type: null,
        data: null,
        numPages: undefined,
      };
    });

  return { type, data };
};

const putFileInReplitStorage = async ({
  file,
  teamId,
  docId,
  restricted = true,
}: {
  file: File;
  teamId: string;
  docId?: string;
  restricted?: boolean;
}) => {
  if (!docId) {
    docId = newId("doc");
  }

  if (
    restricted &&
    file.type !== "image/png" &&
    file.type !== "image/jpeg" &&
    file.type !== "application/pdf"
  ) {
    throw new Error("Only PNG, JPEG, PDF or MP4 files are supported");
  }

  if (!restricted && !SUPPORTED_DOCUMENT_MIME_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type");
  }

  const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateObjectDir) {
    throw new Error("PRIVATE_OBJECT_DIR not configured for Replit storage");
  }

  const { name, ext } = path.parse(file.name);
  const safeFileName = `${slugify(name)}${ext}`;
  const fullPath = `${privateObjectDir}/documents/${docId}/${safeFileName}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const uploadURL = await signObjectURL({
    bucketName,
    objectName,
    method: "PUT",
    ttlSec: 900,
  });

  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    body: new Uint8Array(file.buffer),
    headers: { "Content-Type": file.type },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file to Replit storage: ${uploadResponse.status}`);
  }

  const objectPath = `/objects/documents/${docId}/${safeFileName}`;

  return {
    type: DocumentStorageType.S3_PATH,
    data: objectPath,
  };
};

const putFileInS3Server = async ({
  file,
  teamId,
  docId,
  restricted = true,
}: {
  file: File;
  teamId: string;
  docId?: string;
  restricted?: boolean;
}) => {
  if (!docId) {
    docId = newId("doc");
  }

  if (
    restricted &&
    file.type !== "image/png" &&
    file.type !== "image/jpeg" &&
    file.type !== "application/pdf"
  ) {
    throw new Error("Only PNG, JPEG, PDF or MP4 files are supported");
  }

  if (!restricted && !SUPPORTED_DOCUMENT_MIME_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type");
  }

  const { client, config } = await getTeamS3ClientAndConfig(teamId);

  // Get the basename and extension for the file
  const { name, ext } = path.parse(file.name);

  const key = `${teamId}/${docId}/${slugify(name)}${ext}`;

  const params = {
    Bucket: config.bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.type,
  };

  // Create a new instance of the PutObjectCommand with the parameters
  const command = new PutObjectCommand(params);

  // Send the command to S3
  await client.send(command);

  return {
    type: DocumentStorageType.S3_PATH,
    data: key,
  };
};
