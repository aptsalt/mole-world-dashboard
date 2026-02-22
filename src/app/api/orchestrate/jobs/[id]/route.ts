import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      priority?: number;
      scheduledAt?: string | null;
      status?: string;
      narrationScript?: string;
      narrationMode?: string;
    };

    if (!fs.existsSync(JOBS_PATH)) {
      return NextResponse.json({ error: "Job queue not found" }, { status: 404 });
    }

    const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;
    const job = jobs.find((j) => j.id === id);

    if (!job) {
      return NextResponse.json({ error: `Job not found: ${id}` }, { status: 404 });
    }

    // Apply allowed updates
    if (body.priority !== undefined) job.priority = body.priority;
    if (body.scheduledAt !== undefined) job.scheduledAt = body.scheduledAt;
    if (body.narrationScript !== undefined) job.narrationScript = body.narrationScript;
    if (body.narrationMode !== undefined) job.narrationMode = body.narrationMode;

    // Status changes: only allow cancel (pending → failed) or retry (failed → pending)
    if (body.status === "failed" && job.status === "pending") {
      job.status = "failed";
      job.error = "Cancelled from dashboard";
      job.completedAt = new Date().toISOString();
    } else if (body.status === "pending" && job.status === "failed") {
      job.status = "pending";
      job.error = null;
      job.completedAt = null;
    }

    job.updatedAt = new Date().toISOString();

    // Atomic write
    const tmpFile = JOBS_PATH + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(jobs, null, 2));
    fs.renameSync(tmpFile, JOBS_PATH);

    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
