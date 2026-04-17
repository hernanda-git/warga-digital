import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/r2';

/**
 * Magic bytes for common image formats
 * Used to verify actual file content matches the declared MIME type
 */
const MAGIC_BYTES: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xff, 0xd8, 0xff]),
  'image/jpg': new Uint8Array([0xff, 0xd8, 0xff]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
  'image/gif': new Uint8Array([0x47, 0x49, 0x46, 0x38]), // GIF8
};

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  fileSize?: number;
}

/**
 * Validates an image file with comprehensive security checks
 *
 * @param file - The file to validate
 * @param maxSize - Maximum file size in bytes (defaults to MAX_FILE_SIZE)
 * @returns ValidationResult with validity status and error message if invalid
 */
export async function validateImageFile(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): Promise<ValidationResult> {
  // 1. Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // 2. Validate file size
  if (file.size <= 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
      fileSize: file.size,
    };
  }

  // 3. Validate MIME type against allowlist
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      mimeType: file.type,
    };
  }

  // 4. Validate filename
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.valid) {
    return filenameValidation;
  }

  // 5. Validate file content using magic bytes
  try {
    const contentValidation = await validateFileContent(file, file.type);
    if (!contentValidation.valid) {
      return contentValidation;
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate file content',
    };
  }

  return {
    valid: true,
    mimeType: file.type,
    fileSize: file.size,
  };
}

/**
 * Validates filename for security issues
 *
 * @param filename - The filename to validate
 * @returns ValidationResult
 */
export function validateFilename(filename: string): ValidationResult {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Invalid filename' };
  }

  if (filename.length === 0 || filename.length > 255) {
    return { valid: false, error: 'Filename must be between 1 and 255 characters' };
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, error: 'Filename contains invalid path characters' };
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    return { valid: false, error: 'Filename contains null bytes' };
  }

  // Check for control characters
  if (/[\x00-\x1f\x7f]/.test(filename)) {
    return { valid: false, error: 'Filename contains control characters' };
  }

  return { valid: true };
}

/**
 * Sanitizes a filename by removing dangerous characters
 *
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validates file content using magic bytes
 *
 * @param file - The file to validate
 * @param declaredMimeType - The declared MIME type
 * @returns ValidationResult
 */
export async function validateFileContent(
  file: File,
  declaredMimeType: string
): Promise<ValidationResult> {
  const expectedMagicBytes = MAGIC_BYTES[declaredMimeType];

  if (!expectedMagicBytes) {
    // If we don't have magic bytes for this type, skip validation
    return { valid: true };
  }

  try {
    const buffer = await file.slice(0, expectedMagicBytes.length).arrayBuffer();
    const fileBytes = new Uint8Array(buffer);

    // Compare first few bytes with expected magic bytes
    for (let i = 0; i < expectedMagicBytes.length; i++) {
      if (fileBytes[i] !== expectedMagicBytes[i]) {
        return {
          valid: false,
          error: `File content does not match declared MIME type: ${declaredMimeType}`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read file content for validation',
    };
  }
}

/**
 * Validates image dimensions
 *
 * @param file - The file to validate
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns ValidationResult with dimensions if valid
 */
export async function validateImageDimensions(
  file: File,
  maxWidth?: number,
  maxHeight?: number
): Promise<ValidationResult & { width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (maxWidth && img.width > maxWidth) {
        resolve({
          valid: false,
          error: `Image width exceeds maximum of ${maxWidth}px`,
        });
        return;
      }

      if (maxHeight && img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image height exceeds maximum of ${maxHeight}px`,
        });
        return;
      }

      resolve({
        valid: true,
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image for dimension validation',
      });
    };

    img.src = url;
  });
}

/**
 * Comprehensive validation for article image upload
 *
 * @param file - The file to validate
 * @param options - Validation options
 * @returns ValidationResult
 */
export async function validateArticleImage(
  file: File,
  options: {
    maxSize?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<ValidationResult & { width?: number; height?: number }> {
  const { maxSize = MAX_FILE_SIZE, maxWidth, maxHeight } = options;

  // Basic file validation
  const basicValidation = await validateImageFile(file, maxSize);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  // Dimension validation (if specified)
  if (maxWidth || maxHeight) {
    const dimensionValidation = await validateImageDimensions(file, maxWidth, maxHeight);
    if (!dimensionValidation.valid) {
      return dimensionValidation;
    }
    return {
      valid: true,
      mimeType: basicValidation.mimeType,
      fileSize: basicValidation.fileSize,
      width: dimensionValidation.width,
      height: dimensionValidation.height,
    };
  }

  return basicValidation;
}
