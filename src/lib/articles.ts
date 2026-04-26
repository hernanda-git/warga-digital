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

/**
 * Format plain-text article content into safe HTML.
 * If the content already contains HTML tags, returns it unchanged.
 * Otherwise, wraps blocks in <p> and converts single newlines to <br>,
 * preserving multiple blank lines as extra spacing.
 * @param content - Raw article content
 * @returns Safe HTML string
 */
export function formatArticleContent(content: string): string {
  if (!content) return "";

  // If content already contains HTML tags, trust it as-is
  const hasHtmlTags = /<[^>]+>/.test(content);
  if (hasHtmlTags) return content;

  // Escape HTML entities to prevent accidental tag injection
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const paragraphs: string[] = [];
  let currentPara: string[] = [];
  let emptyLineStreak = 0;

  for (const line of lines) {
    if (line === "") {
      emptyLineStreak++;
      if (currentPara.length > 0) {
        // Escape each line first, then join with real <br> tags
        const escapedLines = currentPara.map(escapeHtml);
        paragraphs.push(`<p>${escapedLines.join("<br>")}</p>`);
        currentPara = [];
      }
      // Each additional empty line beyond the first creates extra spacing
      if (emptyLineStreak > 1) {
        paragraphs.push("<p>&nbsp;</p>");
      }
    } else {
      emptyLineStreak = 0;
      currentPara.push(line);
    }
  }

  // Flush final paragraph
  if (currentPara.length > 0) {
    const escapedLines = currentPara.map(escapeHtml);
    paragraphs.push(`<p>${escapedLines.join("<br>")}</p>`);
  }

  return paragraphs.join("");
}

/**
 * Download an image from URL
 * @param url - Image URL
 * @param filename - Download filename
 */
export async function downloadImage(
  url: string,
  filename: string,
): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}
