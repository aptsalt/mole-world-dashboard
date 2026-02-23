import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const STATE_DIR = path.resolve(process.cwd(), "automation", "state");
const JOBS_PATH = path.join(STATE_DIR, "whatsapp-jobs.json");

function isServiceRunning(label: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("launchctl", ["list", label], { timeout: 3000 }, (err) => {
      resolve(!err);
    });
  });
}

function isOllamaUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); resolve(false); }, 2000);
    fetch("http://localhost:11434/api/tags", { signal: controller.signal })
      .then((r) => { clearTimeout(timer); resolve(r.ok); })
      .catch(() => { clearTimeout(timer); resolve(false); });
  });
}

function isPerplexityUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); resolve(false); }, 2000);
    fetch("http://localhost:18790", { signal: controller.signal })
      .then((r) => { clearTimeout(timer); resolve(r.ok); })
      .catch(() => { clearTimeout(timer); resolve(false); });
  });
}

function isXConfigured(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
}

export async function GET() {
  try {
    // Check pipeline services
    const [workerAlive, bridgeAlive, ollamaUp, perplexityUp] = await Promise.all([
      isServiceRunning("ai.moleworld.pipeline"),
      isServiceRunning("ai.moleworld.bridge"),
      isOllamaUp(),
      isPerplexityUp(),
    ]);
    const xApiConfigured = isXConfigured();

    // Count jobs by status
    let jobStats = { total: 0, pending: 0, active: 0, completed: 0, failed: 0 };
    if (fs.existsSync(JOBS_PATH)) {
      try {
        const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<{ status: string }>;
        jobStats.total = jobs.length;
        for (const j of jobs) {
          switch (j.status) {
            case "pending": jobStats.pending++; break;
            case "completed": jobStats.completed++; break;
            case "failed": jobStats.failed++; break;
            default: jobStats.active++; break;
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // Count by pipeline
    let pipelineStats = { higgsfield: 0, content: 0, distribution: 0, local_gpu: 0 };
    if (fs.existsSync(JOBS_PATH)) {
      try {
        const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<{ status: string; pipeline?: string }>;
        const activeJobs = jobs.filter((j) => !["completed", "failed"].includes(j.status));
        for (const j of activeJobs) {
          const p = (j.pipeline ?? "higgsfield") as keyof typeof pipelineStats;
          if (p in pipelineStats) pipelineStats[p]++;
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      pipelines: {
        local_gpu: { status: "idle", label: "Local GPU", activeJobs: pipelineStats.local_gpu },
        higgsfield: { status: workerAlive ? (pipelineStats.higgsfield > 0 ? "active" : "idle") : "offline", label: "Higgsfield", activeJobs: pipelineStats.higgsfield },
        content: { status: pipelineStats.content > 0 ? "active" : "idle", label: "Content", activeJobs: pipelineStats.content },
        distribution: { status: pipelineStats.distribution > 0 ? "active" : "idle", label: "Distribution", activeJobs: pipelineStats.distribution },
      },
      services: {
        worker: workerAlive,
        bridge: bridgeAlive,
        ollama: ollamaUp,
        xApi: xApiConfigured,
        perplexity: perplexityUp,
      },
      jobStats,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
