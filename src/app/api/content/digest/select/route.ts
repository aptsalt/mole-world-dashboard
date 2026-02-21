import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const DIGEST_PATH = path.resolve(process.cwd(), "automation", "state", "news-digest.json");
const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { indices: number[] };
    const indices = body.indices;

    if (!Array.isArray(indices) || indices.length === 0) {
      return NextResponse.json({ error: "indices must be a non-empty array of numbers" }, { status: 400 });
    }

    // Load today's digest
    if (!fs.existsSync(DIGEST_PATH)) {
      return NextResponse.json({ error: "No digest found" }, { status: 404 });
    }
    const digests = JSON.parse(fs.readFileSync(DIGEST_PATH, "utf-8"));
    const today = new Date().toISOString().slice(0, 10);
    const digest = digests.find((d: { date: string }) => d.date === today);
    if (!digest) {
      return NextResponse.json({ error: "No digest for today" }, { status: 404 });
    }

    // Mark stories selected
    digest.status = "selected";
    digest.selectedStories = indices;
    const tmpDigest = DIGEST_PATH + ".tmp";
    fs.writeFileSync(tmpDigest, JSON.stringify(digests, null, 2));
    fs.renameSync(tmpDigest, DIGEST_PATH);

    // Create news-content jobs
    const jobs = fs.existsSync(JOBS_PATH)
      ? JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8"))
      : [];

    const createdJobs: string[] = [];
    for (const idx of indices) {
      if (idx < 1 || idx > digest.stories.length) continue;
      const story = digest.stories[idx - 1];
      const now = new Date().toISOString();
      const id = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      jobs.push({
        id,
        type: "news-content",
        description: story.title,
        enhancedPrompt: null,
        motionPrompt: null,
        replyTo: "+17789277935",
        senderPhone: "+17789277935",
        status: "pending",
        batchCount: 1,
        outputPaths: [],
        chatResponse: null,
        error: null,
        articleTitle: story.title,
        articleUrl: story.url,
        articleSource: story.source,
        storyId: story.id,
        caption: null,
        narrationScript: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      });
      createdJobs.push(id);
    }

    const tmpJobs = JOBS_PATH + ".tmp";
    fs.writeFileSync(tmpJobs, JSON.stringify(jobs, null, 2));
    fs.renameSync(tmpJobs, JOBS_PATH);

    return NextResponse.json({ created: createdJobs.length, jobIds: createdJobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
