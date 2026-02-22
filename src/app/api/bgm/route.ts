import { NextResponse } from "next/server";
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const AUTOMATION_ROOT = path.resolve(process.cwd(), "automation");
const PRESETS_JSON = path.join(AUTOMATION_ROOT, "bgm-library", "bgm-presets.json");
const TRACKS_DIR = path.join(AUTOMATION_ROOT, "bgm-library", "tracks");

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

/** GET — List all BGM presets with hasTrack status */
export async function GET() {
  try {
    const data = JSON.parse(await readFile(PRESETS_JSON, "utf-8"));

    for (const track of data.tracks) {
      const trackPath = path.join(TRACKS_DIR, track.key, "track.mp3");
      track.hasTrack = await fileExists(trackPath);

      const metaPath = path.join(TRACKS_DIR, track.key, "meta.json");
      if (await fileExists(metaPath)) {
        try {
          track.downloadMeta = JSON.parse(await readFile(metaPath, "utf-8"));
        } catch { /* ignore */ }
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ version: "1.0", defaultTrack: null, defaultVolume: 0.15, tracks: [] });
  }
}

/** PATCH — Update track quality status */
export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { key: string; quality: string };
    const { key, quality } = body;
    if (!key || !quality) {
      return NextResponse.json({ error: "key and quality required" }, { status: 400 });
    }

    const data = JSON.parse(await readFile(PRESETS_JSON, "utf-8"));
    const track = data.tracks.find((t: { key: string }) => t.key === key);
    if (!track) {
      return NextResponse.json({ error: `Track not found: ${key}` }, { status: 404 });
    }

    track.quality = quality;
    await writeFile(PRESETS_JSON, JSON.stringify(data, null, 2) + "\n");

    return NextResponse.json({ ok: true, key, quality });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
