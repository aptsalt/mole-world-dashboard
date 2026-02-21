import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const FRAMES_DIR = path.resolve(process.cwd(), "automation", "output", "frames");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const shotId = formData.get("shotId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!fs.existsSync(FRAMES_DIR)) {
      fs.mkdirSync(FRAMES_DIR, { recursive: true });
    }

    const ext = path.extname(file.name) || ".png";
    const filename = shotId ? `${shotId}_frame${ext}` : `frame_${Date.now()}${ext}`;
    const filePath = path.join(FRAMES_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      ok: true,
      path: filePath,
      relativePath: `automation/output/frames/${filename}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
