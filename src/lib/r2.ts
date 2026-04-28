import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

/**
 * Allowed MIME types for image uploads
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/avif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/**
 * Allowed MIME types for attachment uploads (kas-rt etc.)
 */
export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export type AllowedAttachmentType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

/**
 * Maximum file size for images (10MB)
 */
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/** @deprecated Use MAX_IMAGE_FILE_SIZE instead */
export const MAX_FILE_SIZE = MAX_IMAGE_FILE_SIZE;

/**
 * Maximum file size for attachments (10MB)
 */
export const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Maximum file size for avatars (5MB)
 */
export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Default signed URL expiry time (5 minutes)
 */
export const DEFAULT_SIGNED_URL_EXPIRY = 300; // 5 minutes in seconds

/**
 * Default signed GET URL expiry (1 hour) for private attachments
 */
export const DEFAULT_SIGNED_GET_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Lazy-loaded R2 client instance
 */
let r2ClientInstance: S3Client | null = null;

/**
 * Validates that all required R2 environment variables are set
 */
function validateR2Config(): void {
  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME
  ) {
    const missing = [];
    if (!R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
    if (!R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
    if (!R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
    if (!R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");

    throw new Error(
      `Missing required R2 environment variables: ${missing.join(", ")}. ` +
        `Please check your .env file and ensure these variables are set correctly.`,
    );
  }
}

/**
 * Gets or creates the R2 S3 client
 */
function getR2Client(): S3Client {
  if (!r2ClientInstance) {
    validateR2Config();

    r2ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  return r2ClientInstance;
}

/**
 * Sanitizes a filename by removing special characters and spaces
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generates a deterministic object key for an article image
 * Format: articles/{articleId}/{yyyy}/{mm}/{uuid}-{sanitized-filename}
 */
export function generateObjectKey(
  articleId: string,
  filename: string,
  uuid?: string,
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uniqueId = uuid || crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);

  return `articles/${articleId}/${year}/${month}/${uniqueId}-${sanitized}`;
}

/**
 * Constructs a public URL for a given R2 object key
 */
export function getPublicUrl(objectKey: string): string {
  if (!R2_PUBLIC_BASE_URL) {
    throw new Error("R2_PUBLIC_BASE_URL environment variable is not set");
  }
  return `${R2_PUBLIC_BASE_URL}/${objectKey}`;
}

/**
 * Extracts the R2 object key from a public URL
 */
export function extractObjectKey(publicUrl: string): string | null {
  if (!R2_PUBLIC_BASE_URL) return null;
  if (!publicUrl.startsWith(R2_PUBLIC_BASE_URL)) return null;
  return publicUrl.replace(R2_PUBLIC_BASE_URL + "/", "");
}

/**
 * Generates a signed PUT URL for direct browser-to-R2 upload
 *
 * @param objectKey - The S3 object key for the file
 * @param contentType - The MIME type of the file
 * @param expiresIn - URL expiry time in seconds (default: 300)
 * @returns Object containing objectKey, uploadUrl, and publicUrl
 */
export async function generateSignedUploadUrl(
  objectKey: string,
  contentType: AllowedImageType,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY,
): Promise<{
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
}> {
  // Validate content type
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new Error(
      `Invalid content type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    );
  }

  // Validate R2 config (will throw if missing)
  validateR2Config();

  // Get the R2 client
  const r2Client = getR2Client();

  // Create the PutObject command
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: objectKey,
    ContentType: contentType,
    // Cache headers for immutable images
    CacheControl: "public, max-age=31536000, immutable",
  });

  // Generate the signed URL
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });

  // Generate the public URL
  const publicUrl = `${R2_PUBLIC_BASE_URL}/${objectKey}`;

  return {
    objectKey,
    uploadUrl,
    publicUrl,
  };
}

/**
 * Directly uploads a file to R2 from the server (no signed URL needed)
 *
 * @param body - The file body (Buffer, ArrayBuffer, Uint8Array, Blob, or File)
 * @param objectKey - The S3 object key for the file
 * @param contentType - The MIME type of the file
 * @param cacheControl - Cache control header value (optional)
 * @returns Object containing objectKey and publicUrl
 */
export async function serverUpload(
  body: Buffer | Uint8Array | Blob,
  objectKey: string,
  contentType: string,
  cacheControl?: string,
): Promise<{
  objectKey: string;
  publicUrl: string;
}> {
  validateR2Config();

  const r2Client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: objectKey,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl ?? "public, max-age=31536000, immutable",
  });

  await r2Client.send(command);

  return {
    objectKey,
    publicUrl: getPublicUrl(objectKey),
  };
}

/**
 * Generates a presigned GET URL for temporary access to a private object
 *
 * @param objectKey - The S3 object key
 * @param expiresIn - URL expiry time in seconds (default: 3600)
 * @returns The presigned GET URL string
 */
export async function generateSignedGetUrl(
  objectKey: string,
  expiresIn: number = DEFAULT_SIGNED_GET_URL_EXPIRY,
): Promise<string> {
  validateR2Config();

  const r2Client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: objectKey,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Deletes an object from R2
 *
 * @param objectKey - The S3 object key to delete
 */
export async function deleteObject(objectKey: string): Promise<void> {
  validateR2Config();
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  const r2Client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: objectKey,
  });

  await r2Client.send(command);
}

/**
 * Deletes multiple objects from R2 in a batch
 *
 * @param objectKeys - Array of S3 object keys to delete
 */
export async function deleteObjects(objectKeys: string[]): Promise<void> {
  validateR2Config();
  const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

  if (objectKeys.length === 0) {
    return;
  }

  const r2Client = getR2Client();

  const command = new DeleteObjectsCommand({
    Bucket: R2_BUCKET_NAME!,
    Delete: {
      Objects: objectKeys.map((key) => ({ Key: key })),
      Quiet: false,
    },
  });

  await r2Client.send(command);
}

/**
 * Checks if a content type is allowed for image upload
 */
export function isAllowedContentType(
  contentType: string,
): contentType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType);
}

/**
 * Validates file size against maximum allowed for images
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_IMAGE_FILE_SIZE;
}

/**
 * Gets the R2 bucket name
 */
export function getBucketName(): string {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }
  return R2_BUCKET_NAME;
}

/**
 * Gets the R2 public base URL
 */
export function getPublicBaseUrl(): string {
  if (!R2_PUBLIC_BASE_URL) {
    throw new Error("R2_PUBLIC_BASE_URL environment variable is not set");
  }
  return R2_PUBLIC_BASE_URL;
}

/**
 * Checks if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
}
