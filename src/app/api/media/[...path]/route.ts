import { NextRequest, NextResponse } from "next/server";
import { stat, open } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const OUTPUT_DIR = path.resolve(process.cwd(), "automation", "output");
const AUTOMATION_OUTPUT_DIR = path.resolve(process.cwd(), "automation", "output");
const VOICE_PROFILES_DIR = path.resolve(process.cwd(), "automation", "voice-library");
const VOICE_SAMPLES_DIR = path.resolve(process.cwd(), "automation", "voice-library", "generated");
const BGM_TRACKS_DIR = path.resolve(process.cwd(), "automation", "bgm-library", "tracks");
const MOLT_OUTPUT_DIR = path.join(os.homedir(), ".openclaw", "workspace", "molt-output");

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  const relativePath = segments.join("/");

  // Route to the correct base directory
  const isVoiceProfile = relativePath.startsWith("voice_profiles/");
  const isVoiceSample = relativePath.startsWith("voice_samples/");
  const isBgm = relativePath.startsWith("bgm/");
  const isAutomation = relativePath.startsWith("automation/");
  const isMolt = relativePath.startsWith("molt/");
  const baseDir = isMolt
    ? MOLT_OUTPUT_DIR
    : isVoiceProfile
      ? VOICE_PROFILES_DIR
      : isVoiceSample
        ? VOICE_SAMPLES_DIR
        : isBgm
          ? BGM_TRACKS_DIR
          : isAutomation
            ? AUTOMATION_OUTPUT_DIR
            : OUTPUT_DIR;
  const resolvedRelative = isMolt
    ? relativePath.replace("molt/", "")
    : isVoiceProfile
      ? relativePath.replace("voice_profiles/", "references/")
      : isVoiceSample
        ? relativePath.replace("voice_samples/", "")
        : isBgm
          ? relativePath.replace("bgm/", "")
          : isAutomation
            ? relativePath.replace("automation/", "")
            : relativePath;

  // Security: prevent path traversal
  const filePath = path.resolve(baseDir, resolvedRelative);
  if (!filePath.startsWith(path.resolve(baseDir))) {
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

  const fileSize = fileStat.size;
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new NextResponse("Bad range", { status: 416 });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    const fileHandle = await open(filePath, "r");
    const stream = fileHandle.createReadStream({ start, end });

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
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Full file response
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
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
