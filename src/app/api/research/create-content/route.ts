import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

interface ResearchSelection {
  id: string;
  title: string;
  url: string;
  platform: string;
  content: string;
  author: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { items: ResearchSelection[] };
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
    }

    // Load existing jobs
    const jobs = fs.existsSync(JOBS_PATH)
      ? JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8"))
      : [];

    const createdJobs: string[] = [];
    for (const item of items) {
      const now = new Date().toISOString();
      const id = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      jobs.push({
        id,
        type: "news-content",
        description: item.title,
        enhancedPrompt: null,
        motionPrompt: null,
        replyTo: "+17789277935",
        senderPhone: "+17789277935",
        status: "pending",
        batchCount: 1,
        outputPaths: [],
        chatResponse: null,
        error: null,
        articleTitle: item.title,
        articleUrl: item.url,
        articleSource: `${item.platform}:${item.author}`,
        storyId: item.id,
        caption: null,
        narrationScript: null,
        source: "dashboard",
        pipeline: "content",
        priority: 10,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      });
      createdJobs.push(id);
    }

    // Atomic write
    const tmpPath = JOBS_PATH + ".tmp";
    const dir = path.dirname(JOBS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(jobs, null, 2));
    fs.renameSync(tmpPath, JOBS_PATH);

    return NextResponse.json({ created: createdJobs.length, jobIds: createdJobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
