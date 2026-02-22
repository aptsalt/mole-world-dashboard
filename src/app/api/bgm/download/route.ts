import { NextRequest, NextResponse } from "next/server";
import { runTsx } from "@/lib/run-tsx";

/** POST — Download a BGM track via yt-dlp */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { key: string; force?: boolean };
    const { key, force } = body;

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const tsxScript = `
import { loadBgmLibrary } from './src/bgm/bgm-library.js';
import { downloadTrack } from './src/bgm/bgm-downloader.js';

const lib = loadBgmLibrary();
const track = lib.tracks.find((t) => t.key === ${JSON.stringify(key)});
if (!track) {
  console.log(JSON.stringify({ ok: false, error: "Track not found: ${key}" }));
  process.exit(0);
}

try {
  const outputPath = await downloadTrack(track, { force: ${!!force} });
  console.log(JSON.stringify({ ok: true, key: track.key, path: outputPath }));
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
}
`;

    const result = await runTsx(tsxScript, { timeoutMs: 300_000 });

    if (!result.ok) {
      return NextResponse.json({ error: result.error as string }, { status: 500 });
    }

    return NextResponse.json({ ok: true, key, path: result.path as string });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
