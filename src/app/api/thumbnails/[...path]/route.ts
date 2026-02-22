import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, basename, extname } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Resolve the automation output directory
const BASE_DIR = join(process.cwd(), "automation", "output");
const THUMB_CACHE_DIR = join(process.cwd(), "automation", ".thumbcache");

// Allowed thumbnail sizes
const SIZES: Record<string, { width: number; height: number }> = {
  sm: { width: 160, height: 90 },
  md: { width: 320, height: 180 },
  lg: { width: 640, height: 360 },
};

function sanitizePath(segments: string[]): string | null {
  const joined = segments.join("/");
  if (joined.includes("..") || joined.includes("~")) return null;
  return joined;
}

async function generateImageThumbnail(
  sourcePath: string,
  thumbPath: string,
  width: number,
  height: number,
): Promise<boolean> {
  try {
    // Use sips (macOS) for image resizing — no external dependency needed
    await mkdir(dirname(thumbPath), { recursive: true });
    // Try sips first (macOS built-in)
    await execFileAsync("sips", [
      "-z", String(height), String(width),
      "--out", thumbPath,
      sourcePath,
    ]);
    return true;
  } catch {
    try {
      // Fallback: try ffmpeg for both images and video thumbnails
      await execFileAsync("ffmpeg", [
        "-y", "-i", sourcePath,
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        "-frames:v", "1",
        "-q:v", "5",
        thumbPath,
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

async function generateVideoThumbnail(
  sourcePath: string,
  thumbPath: string,
  width: number,
  height: number,
): Promise<boolean> {
  try {
    await mkdir(dirname(thumbPath), { recursive: true });
    // Extract frame at 1 second mark
    await execFileAsync("ffmpeg", [
      "-y", "-i", sourcePath,
      "-ss", "1",
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      "-frames:v", "1",
      "-q:v", "5",
      thumbPath,
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const rawPath = sanitizePath(segments);
  if (!rawPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Parse size from query params
  const size = req.nextUrl.searchParams.get("size") || "md";
  const dims = SIZES[size] || SIZES.md;

  const sourcePath = join(BASE_DIR, rawPath);
  if (!existsSync(sourcePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Generate cached thumbnail path
  const ext = extname(sourcePath).toLowerCase();
  const isVideo = [".mp4", ".webm", ".mov", ".avi"].includes(ext);
  const thumbExt = isVideo ? ".jpg" : ext;
  const thumbPath = join(THUMB_CACHE_DIR, size, rawPath.replace(ext, thumbExt));

  // Serve from cache if exists
  if (existsSync(thumbPath)) {
    const data = await readFile(thumbPath);
    const contentType = thumbExt === ".png" ? "image/png" : "image/jpeg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  // Generate thumbnail
  let success = false;
  if (isVideo) {
    success = await generateVideoThumbnail(sourcePath, thumbPath, dims.width, dims.height);
  } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    success = await generateImageThumbnail(sourcePath, thumbPath, dims.width, dims.height);
  }

  if (!success || !existsSync(thumbPath)) {
    // Fallback: serve original file
    const data = await readFile(sourcePath);
    return new NextResponse(data, {
      headers: { "Content-Type": isVideo ? "video/mp4" : "image/png" },
    });
  }

  const data = await readFile(thumbPath);
  const contentType = thumbExt === ".png" ? "image/png" : "image/jpeg";
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
