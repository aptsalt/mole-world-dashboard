import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const ARCHIVE_PATH = path.resolve(process.cwd(), "automation", "state", "job-archive.json");

interface ArchivedJob {
  id: string;
  type: string;
  description: string;
  status: string;
  senderPhone: string;
  priority: number;
  source: string;
  pipeline: string;
  voiceKey: string | null;
  imageModelAlias: string | null;
  videoModelAlias: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? "";
    const typeFilter = searchParams.get("type") ?? "";
    const statusFilter = searchParams.get("status") ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!fs.existsSync(ARCHIVE_PATH)) {
      return NextResponse.json({ jobs: [], total: 0, limit, offset });
    }

    let archive: ArchivedJob[] = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf-8"));

    // Filter
    if (search) {
      const q = search.toLowerCase();
      archive = archive.filter(
        (j) => j.description.toLowerCase().includes(q) || j.id.includes(q),
      );
    }
    if (typeFilter) {
      archive = archive.filter((j) => j.type === typeFilter);
    }
    if (statusFilter) {
      archive = archive.filter((j) => j.status === statusFilter);
    }

    // Sort newest first
    archive.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    const total = archive.length;
    const jobs = archive.slice(offset, offset + limit);

    return NextResponse.json({ jobs, total, limit, offset });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
