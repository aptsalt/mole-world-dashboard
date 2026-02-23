import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const STATE_DIR = path.resolve(process.cwd(), "automation", "state");
const JOBS_PATH = path.join(STATE_DIR, "whatsapp-jobs.json");

interface JobSummary {
  id: string;
  type: string;
  description: string;
  status: string;
  priority: number;
  createdAt: string;
}

export async function GET() {
  try {
    const stats = { total: 0, pending: 0, active: 0, completed: 0, failed: 0 };
    const recentJobs: JobSummary[] = [];

    if (fs.existsSync(JOBS_PATH)) {
      const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;
      stats.total = jobs.length;
      for (const j of jobs) {
        switch (j.status) {
          case "pending": stats.pending++; break;
          case "completed": stats.completed++; break;
          case "failed": stats.failed++; break;
          default: stats.active++; break;
        }
      }
      // Recent 10 jobs sorted by createdAt DESC
      const sorted = [...jobs].sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
      );
      for (const j of sorted.slice(0, 10)) {
        recentJobs.push({
          id: String(j.id ?? ""),
          type: String(j.type ?? ""),
          description: String(j.description ?? "").slice(0, 100),
          status: String(j.status ?? ""),
          priority: Number(j.priority ?? 0),
          createdAt: String(j.createdAt ?? ""),
        });
      }
    }

    return NextResponse.json({ ...stats, recentJobs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
