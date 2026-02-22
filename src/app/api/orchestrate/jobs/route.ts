import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const pipelineFilter = searchParams.get("pipeline");
    const sourceFilter = searchParams.get("source");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    if (!fs.existsSync(JOBS_PATH)) {
      return NextResponse.json([]);
    }

    let jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;

    // Apply filters
    if (statusFilter) {
      const statuses = statusFilter.split(",");
      jobs = jobs.filter((j) => statuses.includes(j.status as string));
    }
    if (pipelineFilter) {
      jobs = jobs.filter((j) => (j.pipeline ?? "higgsfield") === pipelineFilter);
    }
    if (sourceFilter) {
      jobs = jobs.filter((j) => (j.source ?? "whatsapp") === sourceFilter);
    }

    // Sort newest first, then by priority DESC
    jobs.sort((a, b) => {
      const pA = (a.priority as number) ?? 0;
      const pB = (b.priority as number) ?? 0;
      if (pB !== pA) return pB - pA;
      return ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? "");
    });

    return NextResponse.json(jobs.slice(0, limit));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      type: string;
      description: string;
      pipeline?: string;
      priority?: number;
      scheduledAt?: string | null;
      narrationMode?: string;
      narrationScript?: string;
      voiceKey?: string;
      imageModelAlias?: string;
      videoModelAlias?: string;
      bgmPresetKey?: string;
      bgmVolume?: number;
    };

    if (!body.type || !body.description) {
      return NextResponse.json({ error: "type and description are required" }, { status: 400 });
    }

    // Read existing jobs
    ensureDir(JOBS_PATH);
    let jobs: Array<Record<string, unknown>> = [];
    if (fs.existsSync(JOBS_PATH)) {
      try {
        jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8"));
      } catch { /* start fresh */ }
    }

    const now = new Date().toISOString();
    const job = {
      id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: body.type,
      description: body.description,
      enhancedPrompt: null,
      motionPrompt: null,
      endFramePrompt: null,
      replyTo: "",
      senderPhone: "",
      status: "pending",
      batchCount: 1,
      outputPaths: [],
      chatResponse: null,
      error: null,
      articleTitle: null,
      articleUrl: null,
      articleSource: null,
      storyId: null,
      caption: null,
      narrationScript: body.narrationScript ?? null,
      sharedMediaPath: null,
      postPlatforms: [],
      contentPostId: null,
      voiceKey: body.voiceKey ?? null,
      imageModelAlias: body.imageModelAlias ?? null,
      videoModelAlias: body.videoModelAlias ?? null,
      scheduledAt: body.scheduledAt ?? null,
      priority: body.priority ?? 0,
      source: "dashboard" as const,
      narrationMode: body.narrationMode ?? "auto",
      pipeline: body.pipeline ?? "higgsfield",
      narrationStatus: "none",
      narrationAudioPath: null,
      narratedVideoPath: null,
      shotPlans: null,
      audioSettings: null,
      bgmPresetKey: body.bgmPresetKey ?? null,
      bgmVolume: body.bgmVolume ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    jobs.push(job);

    // Atomic write
    const tmpFile = JOBS_PATH + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(jobs, null, 2));
    fs.renameSync(tmpFile, JOBS_PATH);

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
