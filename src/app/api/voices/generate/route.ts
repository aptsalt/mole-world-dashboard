import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { runTsx } from "@/lib/run-tsx";

const AUTOMATION_DIR = path.resolve(process.cwd(), "automation");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text?: string; voiceKey?: string };
    const { text, voiceKey } = body;

    if (!text || !voiceKey) {
      return NextResponse.json({ error: "text and voiceKey are required" }, { status: 400 });
    }

    const outputPath = path.join(AUTOMATION_DIR, "voice-library", "generated", voiceKey, `test_${Date.now()}.wav`);

    const tsxScript = `
import { generateSpeech } from './src/tts/tts-engine.js';

const result = await generateSpeech(${JSON.stringify(text)}, ${JSON.stringify(voiceKey)}, ${JSON.stringify(outputPath)});
console.log(JSON.stringify({ ok: true, path: result.outputPath, durationMs: result.durationMs }));
`;

    const result = await runTsx(tsxScript, { timeoutMs: 120_000 });

    if (!result.ok) {
      return NextResponse.json({ error: result.error as string }, { status: 500 });
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
