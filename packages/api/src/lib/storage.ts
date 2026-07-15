import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createError } from "../middleware/error-handler";

export interface UploadResult {
  key: string;
  url: string | null;
}

let s3Client: S3Client | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw createError(`${name} is not configured`, 500);
  }

  return value;
}

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  s3Client = new S3Client({
    region: getRequiredEnv("S3_REGION"),
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: getRequiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });

  return s3Client;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const bucket = getRequiredEnv("S3_BUCKET");
  const serverSideEncryption =
    process.env.S3_SERVER_SIDE_ENCRYPTION === "AES256" ? "AES256" : undefined;

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: serverSideEncryption,
      }),
    );
  } catch {
    throw createError("Could not store contract file", 502);
  }

  return {
    key,
    url: null,
  };
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const bucket = getRequiredEnv("S3_BUCKET");

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn },
  );
}
