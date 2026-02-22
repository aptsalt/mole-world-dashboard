import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { runTsx } from "@/lib/run-tsx";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

/** POST — Generate narration script via Ollama (uses shot plan data from the job when available) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      jobId: string;
      topic: string;
      videoDurationSec?: number;
    };

    if (!body.jobId || !body.topic) {
      return NextResponse.json({ error: "jobId and topic are required" }, { status: 400 });
    }

    const videoDuration = body.videoDurationSec ?? 30;

    // Read job to get shot plans if available
    let shotPlansJson = "null";
    if (fs.existsSync(JOBS_PATH)) {
      const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;
      const job = jobs.find((j) => j.id === body.jobId);
      if (job?.shotPlans && Array.isArray(job.shotPlans) && job.shotPlans.length > 0) {
        const completedShots = (job.shotPlans as Array<Record<string, unknown>>).map((s) => ({
          shotNumber: s.shotNumber,
          imagePrompt: s.imagePrompt ?? s.prompt ?? body.topic,
          motionPrompt: s.motionPrompt ?? "",
        }));
        shotPlansJson = JSON.stringify(completedShots);
      }
    }

    const tsxScript = `
import { generatePostVideoNarration } from './src/composition/shot-planner.js';

const stored = ${shotPlansJson};
const completedShots = stored ?? Array.from({ length: 6 }, (_, i) => ({
  shotNumber: i + 1,
  imagePrompt: ${JSON.stringify(body.topic)},
  motionPrompt: "",
}));

const result = await generatePostVideoNarration(
  ${JSON.stringify(body.topic)},
  completedShots,
  ${videoDuration},
);
console.log(JSON.stringify({ ok: true, script: result }));
`;

    const result = await runTsx(tsxScript, { timeoutMs: 120_000 });

    if (!result.ok || !result.script) {
      return NextResponse.json({ error: (result.error as string) ?? "No script generated" }, { status: 500 });
    }

    const script = result.script as string;

    // Update job: save script + status
    updateJobField(body.jobId, {
      narrationScript: script,
      narrationStatus: "script_ready",
    });

    const wordCount = script.split(/\s+/).filter(Boolean).length;
    const estimatedDurationSec = Math.round(wordCount / 2.5);

    return NextResponse.json({ script, wordCount, estimatedDurationSec });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** PUT — Save a manually written/edited script (no Ollama call) */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as {
      jobId: string;
      script: string;
    };

    if (!body.jobId || !body.script?.trim()) {
      return NextResponse.json({ error: "jobId and script are required" }, { status: 400 });
    }

    updateJobField(body.jobId, {
      narrationScript: body.script,
      narrationStatus: "script_ready",
    });

    const wordCount = body.script.split(/\s+/).filter(Boolean).length;
    const estimatedDurationSec = Math.round(wordCount / 2.5);

    return NextResponse.json({ script: body.script, wordCount, estimatedDurationSec });
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
