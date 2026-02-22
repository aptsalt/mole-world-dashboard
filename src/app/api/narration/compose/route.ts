import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runTsx } from "@/lib/run-tsx";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");
const MOLT_OUTPUT_DIR = path.join(os.homedir(), ".openclaw", "workspace", "molt-output");
const BGM_TRACKS_DIR = path.resolve(process.cwd(), "automation", "bgm-library", "tracks");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      jobId: string;
      audioSettings?: {
        narrationVolume?: number;
        fadeIn?: number;
        fadeOut?: number;
      };
      bgm?: {
        trackKey: string;
        volume?: number;
      } | null;
    };

    if (!body.jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Read job to get paths
    if (!fs.existsSync(JOBS_PATH)) {
      return NextResponse.json({ error: "Jobs file not found" }, { status: 404 });
    }

    const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;
    const job = jobs.find((j) => j.id === body.jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Find silent video and narration audio
    const outputPaths = (job.outputPaths as string[]) ?? [];
    const silentVideoPath = outputPaths.find((p: string) => p.includes("_silent.mp4"));
    const narrationAudioPath = job.narrationAudioPath as string | null;

    if (!silentVideoPath || !fs.existsSync(silentVideoPath)) {
      return NextResponse.json({ error: "Silent video not found" }, { status: 400 });
    }
    if (!narrationAudioPath || !fs.existsSync(narrationAudioPath)) {
      return NextResponse.json({ error: "Narration audio not found. Generate TTS first." }, { status: 400 });
    }

    const narratedVideoPath = path.join(MOLT_OUTPUT_DIR, `${body.jobId}_lesson_narrated.mp4`);
    const settings = body.audioSettings ?? {};
    const volume = settings.narrationVolume ?? 1.0;
    const fadeIn = settings.fadeIn ?? 0.5;
    const fadeOut = settings.fadeOut ?? 1.0;

    // Resolve BGM track path
    let bgmMusicPath: string | null = null;
    let bgmVolume = 0.15;
    if (body.bgm?.trackKey) {
      const trackPath = path.join(BGM_TRACKS_DIR, body.bgm.trackKey, "track.mp3");
      if (fs.existsSync(trackPath)) {
        bgmMusicPath = trackPath;
        bgmVolume = body.bgm.volume ?? 0.15;
      }
    }

    // Mark as composing
    updateJobField(body.jobId, { narrationStatus: "composing" });

    // BUG FIX: was passing fadeInSec/fadeOutSec but function expects fadeIn/fadeOut
    const optionsObj = bgmMusicPath
      ? `{ fadeIn: ${fadeIn}, fadeOut: ${fadeOut}, narrationVolume: ${volume}, bgMusicPath: ${JSON.stringify(bgmMusicPath)}, musicVolume: ${bgmVolume} }`
      : `{ fadeIn: ${fadeIn}, fadeOut: ${fadeOut}, narrationVolume: ${volume} }`;

    const tsxScript = `
import { addContinuousNarration } from './src/audio/audio-mixer.js';

const result = await addContinuousNarration(
  ${JSON.stringify(silentVideoPath)},
  ${JSON.stringify(narrationAudioPath)},
  ${JSON.stringify(narratedVideoPath)},
  ${optionsObj},
);
console.log(JSON.stringify({ ok: true, path: result }));
`;

    const result = await runTsx(tsxScript, { timeoutMs: 120_000 });

    if (!result.ok) {
      updateJobField(body.jobId, { narrationStatus: "tts_ready" }); // revert
      return NextResponse.json({ error: result.error as string }, { status: 500 });
    }

    // Update job with narrated video path
    const updatedOutputPaths = [...outputPaths];
    if (!updatedOutputPaths.includes(narratedVideoPath)) {
      updatedOutputPaths.push(narratedVideoPath);
    }

    updateJobField(body.jobId, {
      narrationStatus: "composed",
      narratedVideoPath,
      outputPaths: updatedOutputPaths,
      audioSettings: { narrationVolume: volume, fadeIn, fadeOut },
      ...(body.bgm?.trackKey ? { bgmPresetKey: body.bgm.trackKey, bgmVolume } : {}),
    });

    const relPath = path.relative(MOLT_OUTPUT_DIR, narratedVideoPath);
    return NextResponse.json({ videoUrl: `/api/media/molt/${relPath}` });
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
