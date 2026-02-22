import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, narrationMode, narrationScript } = body as {
      jobId: string;
      narrationMode: "auto" | "manual";
      narrationScript?: string;
    };

    if (!jobId || !narrationMode) {
      return NextResponse.json({ error: "jobId and narrationMode are required" }, { status: 400 });
    }

    if (!["auto", "manual"].includes(narrationMode)) {
      return NextResponse.json({ error: "narrationMode must be 'auto' or 'manual'" }, { status: 400 });
    }

    if (!fs.existsSync(JOBS_PATH)) {
      return NextResponse.json({ error: "Jobs file not found" }, { status: 404 });
    }

    const allJobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;
    const jobIndex = allJobs.findIndex((j) => j.id === jobId);

    if (jobIndex === -1) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = allJobs[jobIndex];
    const status = (job.narrationStatus as string) ?? "none";

    // Only allow mode changes when narration hasn't progressed past script stage
    if (!["none", "script_ready"].includes(status)) {
      return NextResponse.json(
        { error: `Cannot change narration mode when status is '${status}'` },
        { status: 409 },
      );
    }

    // Update the job
    job.narrationMode = narrationMode;
    if (narrationMode === "manual" && narrationScript !== undefined) {
      job.narrationScript = narrationScript;
      if (narrationScript.trim()) {
        job.narrationStatus = "script_ready";
      }
    }
    job.updatedAt = new Date().toISOString();

    allJobs[jobIndex] = job;
    fs.writeFileSync(JOBS_PATH, JSON.stringify(allJobs, null, 2));

    return NextResponse.json({ ok: true, job });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
