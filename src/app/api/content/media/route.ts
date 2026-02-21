import { NextRequest, NextResponse } from "next/server";
import { stat, open } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const MOLT_OUTPUT_DIR = path.join(os.homedir(), ".openclaw", "workspace", "molt-output");

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("file");
  if (!filename) {
    return new NextResponse("Missing file parameter", { status: 400 });
  }

  // Security: only allow simple filenames (no path traversal)
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const filePath = path.join(MOLT_OUTPUT_DIR, filename);
  if (!filePath.startsWith(path.resolve(MOLT_OUTPUT_DIR))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] ?? "application/octet-stream";

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileHandle = await open(filePath, "r");
  const stream = fileHandle.createReadStream();

  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
      fileHandle.close();
    },
  });

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
