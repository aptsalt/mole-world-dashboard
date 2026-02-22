import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runTsx } from "@/lib/run-tsx";
import { broadcast } from "@/lib/sse";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");
const MOLT_OUTPUT_DIR = path.join(os.homedir(), ".openclaw", "workspace", "molt-output");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      jobId: string;
      script: string;
      voiceKey?: string;
      engine?: "f5tts" | "bark-openvoice";
    };

    if (!body.jobId || !body.script) {
      return NextResponse.json({ error: "jobId and script are required" }, { status: 400 });
    }

    const voiceKey = body.voiceKey ?? "morgan_freeman";
    const engine = body.engine ?? "f5tts";
    const outputDir = path.join(MOLT_OUTPUT_DIR, body.jobId);
    const outputPath = path.join(outputDir, `${body.jobId}_narration.wav`);

    // Ensure output dir exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Mark job as generating_tts
    updateJobField(body.jobId, { narrationStatus: "generating_tts" });

    const tsxScript = `
import { generateSpeech } from './src/tts/tts-engine.js';

const result = await generateSpeech(
  ${JSON.stringify(body.script)},
  ${JSON.stringify(voiceKey)},
  ${JSON.stringify(outputPath)},
  { engine: ${JSON.stringify(engine)} },
);
console.log(JSON.stringify({ ok: true, path: result.outputPath, durationMs: result.durationMs, engine: result.engine }));
`;

    // F5-TTS takes 77-300s
    const result = await runTsx(tsxScript, { timeoutMs: 600_000 });

    if (!result.ok) {
      updateJobField(body.jobId, { narrationStatus: "script_ready" }); // revert
      return NextResponse.json({ error: result.error as string }, { status: 500 });
    }

    // Update job with audio path
    const audioRelPath = path.relative(MOLT_OUTPUT_DIR, outputPath);
    updateJobField(body.jobId, {
      narrationStatus: "tts_ready",
      narrationAudioPath: outputPath,
    });

    await broadcast("narration:update", { jobId: body.jobId, status: "tts_complete" });

    return NextResponse.json({
      audioUrl: `/api/media/molt/${audioRelPath}`,
      durationMs: (result.durationMs as number) ?? 0,
      engine: (result.engine as string) ?? engine,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

function updateJobField(jobId: string, updates: Record<string, unknown>) {
  if (!fs.existsSync(JOBS_PATH)) return;
  const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return;
  Object.assign(jobs[idx], updates, { updatedAt: new Date().toISOString() });
  const tmpFile = JOBS_PATH + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(jobs, null, 2));
  fs.renameSync(tmpFile, JOBS_PATH);
}
