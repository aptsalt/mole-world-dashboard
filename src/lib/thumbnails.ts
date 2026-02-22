/**
 * Generate a thumbnail URL for a media file.
 * Falls back to the original media URL if thumbnails aren't available.
 */
export function getThumbnailUrl(
  mediaPath: string,
  size: "sm" | "md" | "lg" = "md",
): string {
  // Strip leading /api/media/ prefix if present
  const cleanPath = mediaPath
    .replace(/^\/api\/media\//, "")
    .replace(/^\//, "");

  return `/api/thumbnails/${cleanPath}?size=${size}`;
}

/**
 * Check if a file path is a video
 */
export function isVideoPath(path: string): boolean {
  return /\.(mp4|webm|mov|avi)$/i.test(path);
}
