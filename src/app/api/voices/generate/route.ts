import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";

const AUTOMATION_DIR = path.resolve(process.cwd(), "automation");
const TSX = "npx";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text?: string; voiceKey?: string };
    const { text, voiceKey } = body;

    if (!text || !voiceKey) {
      return NextResponse.json({ error: "text and voiceKey are required" }, { status: 400 });
    }

    // Generate via the TTS engine (shells out to tsx)
    const outputPath = path.join(AUTOMATION_DIR, "voice-library", "generated", voiceKey, `test_${Date.now()}.wav`);

    const result = await new Promise<{ ok: boolean; path?: string; error?: string }>((resolve) => {
      const script = `
        import { generateSpeech } from './src/tts/tts-engine.js';
        const result = await generateSpeech(${JSON.stringify(text)}, ${JSON.stringify(voiceKey)}, ${JSON.stringify(outputPath)});
        console.log(JSON.stringify({ ok: true, path: result.outputPath, durationMs: result.durationMs }));
      `;

      execFile(TSX, ["tsx", "-e", script], {
        cwd: AUTOMATION_DIR,
        timeout: 120_000,
      }, (err, stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: stderr?.toString().slice(-200) || err.message });
        } else {
          try {
            resolve(JSON.parse(stdout.toString().trim()));
          } catch {
            resolve({ ok: false, error: "Unexpected output" });
          }
        }
      });
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      path: result.path,
      audioUrl: `/api/media/voice_samples/${voiceKey}/test_${Date.now()}.wav`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
