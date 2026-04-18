/**
 * Calculate estimated reading time for article content
 * @param content - HTML or plain text content
 * @param wordsPerMinute - Reading speed (default: 200 wpm for average reader)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(
  content: string,
  wordsPerMinute: number = 200,
): number {
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, "");
  // Count words
  const wordCount = plainText.split(/\s+/).filter((word) => word.length > 0)
    .length;
  // Calculate minutes
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Format date to Indonesian locale
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDateIndonesian(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Generate excerpt from content if not provided
 * @param content - HTML content
 * @param maxLength - Maximum excerpt length
 * @returns Plain text excerpt
 */
export function generateExcerpt(
  content: string,
  maxLength: number = 160,
): string {
  const plainText = content.replace(/<[^>]*>/g, "");
  return truncateText(plainText, maxLength);
}
