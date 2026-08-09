import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadResult {
  key: string;
  url: string | null;
}

let s3Client: S3Client | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
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
    throw new Error("Could not store contract file");
  }

  return {
    key,
    url: null,
  };
}

export async function downloadFile(key: string): Promise<Buffer> {
  const bucket = getRequiredEnv("S3_BUCKET");

  let response;
  try {
    response = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
  } catch (error) {
    throw new Error("Could not retrieve contract file");
  }

  if (!response.Body) {
    throw new Error("Could not retrieve contract file");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
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

export async function deleteFile(key: string): Promise<void> {
  const bucket = getRequiredEnv("S3_BUCKET");

  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch {
    throw new Error("Could not delete stored file");
  }
}
