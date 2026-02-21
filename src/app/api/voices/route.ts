import { NextResponse } from "next/server";
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const AUTOMATION_ROOT = path.resolve(process.cwd(), "automation");
const VOICES_JSON = path.join(AUTOMATION_ROOT, "voice-library", "voices.json");
const REFERENCES_DIR = path.join(AUTOMATION_ROOT, "voice-library", "references");

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function GET() {
  try {
    const data = JSON.parse(await readFile(VOICES_JSON, "utf-8"));

    // Enrich each voice with hasReference (whether the clip exists on disk)
    for (const voice of data.voices) {
      const refPath = path.join(REFERENCES_DIR, voice.key, "reference.wav");
      voice.hasReference = await fileExists(refPath);

      // Read meta.json if it exists (download info)
      const metaPath = path.join(REFERENCES_DIR, voice.key, "meta.json");
      if (await fileExists(metaPath)) {
        try {
          voice.downloadMeta = JSON.parse(await readFile(metaPath, "utf-8"));
        } catch { /* ignore */ }
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ version: "1.0", defaultVoice: "morgan_freeman", voices: [] });
  }
}

/** PATCH — update voice quality status */
export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { key: string; quality: string };
    const { key, quality } = body;
    if (!key || !quality) {
      return NextResponse.json({ error: "key and quality required" }, { status: 400 });
    }

    const data = JSON.parse(await readFile(VOICES_JSON, "utf-8"));
    const voice = data.voices.find((v: { key: string }) => v.key === key);
    if (!voice) {
      return NextResponse.json({ error: `Voice not found: ${key}` }, { status: 404 });
    }

    voice.quality = quality;
    await writeFile(VOICES_JSON, JSON.stringify(data, null, 2) + "\n");

    return NextResponse.json({ ok: true, key, quality });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
