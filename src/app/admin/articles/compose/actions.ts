"use server";

import { generateSignedUploadUrl } from "@/lib/r2";

/**
 * Server action to generate a signed upload URL for R2
 * This runs on the server to protect R2 credentials
 */
export async function getSignedUploadUrl(
  objectKey: string,
  contentType: string,
  expiresIn: number = 300,
): Promise<{
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
}> {
  try {
    return await generateSignedUploadUrl(
      objectKey,
      contentType as any,
      expiresIn,
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate upload URL",
    );
  }
}
