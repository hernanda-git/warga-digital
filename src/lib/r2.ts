import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  throw new Error('Missing required R2 environment variables');
}

// Create R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Allowed MIME types for article images
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];

/**
 * Maximum file size for uploads (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Default signed URL expiry time (5 minutes)
 */
export const DEFAULT_SIGNED_URL_EXPIRY = 300; // 5 minutes in seconds

/**
 * Sanitizes a filename by removing special characters and spaces
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates a deterministic object key for an article image
 * Format: articles/{articleId}/{yyyy}/{mm}/{uuid}-{sanitized-filename}
 */
export function generateObjectKey(
  articleId: string,
  filename: string,
  uuid?: string
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uniqueId = uuid || crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);

  return `articles/${articleId}/${year}/${month}/${uniqueId}-${sanitized}`;
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
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<{
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
}> {
  // Validate content type
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new Error(`Invalid content type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  // Create the PutObject command
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    // Cache headers for immutable images
    CacheControl: 'public, max-age=31536000, immutable',
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
 * Deletes an object from R2
 *
 * @param objectKey - The S3 object key to delete
 */
export async function deleteObject(objectKey: string): Promise<void> {
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
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
  const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

  if (objectKeys.length === 0) {
    return;
  }

  const command = new DeleteObjectsCommand({
    Bucket: R2_BUCKET_NAME,
    Delete: {
      Objects: objectKeys.map((key) => ({ Key: key })),
      Quiet: false,
    },
  });

  await r2Client.send(command);
}

/**
 * Checks if a content type is allowed for upload
 */
export function isAllowedContentType(contentType: string): contentType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType);
}

/**
 * Validates file size against maximum allowed
 */
export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Gets the R2 bucket name
 */
export function getBucketName(): string {
  return R2_BUCKET_NAME!;
}

/**
 * Gets the R2 public base URL
 */
export function getPublicBaseUrl(): string {
  return R2_PUBLIC_BASE_URL!;
}
