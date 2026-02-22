import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const JOBS_PATH = path.resolve(process.cwd(), "automation", "state", "whatsapp-jobs.json");
const MOLT_OUTPUT_DIR = path.join(os.homedir(), ".openclaw", "workspace", "molt-output");

export async function GET() {
  try {
    if (!fs.existsSync(JOBS_PATH)) {
      return NextResponse.json([]);
    }
    const allJobs = JSON.parse(fs.readFileSync(JOBS_PATH, "utf-8")) as Array<Record<string, unknown>>;

    // Filter: completed lessons/clips OR any job with narrationStatus !== "none"
    const narrationJobs = allJobs.filter((j) => {
      const isNarrationActive = j.narrationStatus && j.narrationStatus !== "none";
      const isCompletedLessonOrClip =
        (j.type === "lesson" || j.type === "clip") && j.status === "completed";
      return isNarrationActive || isCompletedLessonOrClip;
    });

    // Detect silent video path from outputPaths
    const enriched = narrationJobs.map((j) => {
      const outputPaths = (j.outputPaths as string[]) ?? [];
      const silentVideoPath = outputPaths.find((p: string) => p.includes("_silent.mp4")) ?? null;

      // Check if files exist on disk
      let silentVideoExists = false;
      let narrationAudioExists = false;
      let narratedVideoExists = false;

      if (silentVideoPath) {
        silentVideoExists = fs.existsSync(silentVideoPath);
      }
      if (j.narrationAudioPath && typeof j.narrationAudioPath === "string") {
        narrationAudioExists = fs.existsSync(j.narrationAudioPath);
      }
      if (j.narratedVideoPath && typeof j.narratedVideoPath === "string") {
        narratedVideoExists = fs.existsSync(j.narratedVideoPath);
      }

      // Build media URLs
      const jobId = j.id as string;
      let silentVideoUrl: string | null = null;
      let narrationAudioUrl: string | null = null;
      let narratedVideoUrl: string | null = null;

      if (silentVideoPath && silentVideoExists) {
        // Extract relative path from MOLT_OUTPUT_DIR
        const rel = path.relative(MOLT_OUTPUT_DIR, silentVideoPath);
        if (!rel.startsWith("..")) {
          silentVideoUrl = `/api/media/molt/${rel}`;
        }
      }
      if (j.narrationAudioPath && narrationAudioExists) {
        const rel = path.relative(MOLT_OUTPUT_DIR, j.narrationAudioPath as string);
        if (!rel.startsWith("..")) {
          narrationAudioUrl = `/api/media/molt/${rel}`;
        }
      }
      if (j.narratedVideoPath && narratedVideoExists) {
        const rel = path.relative(MOLT_OUTPUT_DIR, j.narratedVideoPath as string);
        if (!rel.startsWith("..")) {
          narratedVideoUrl = `/api/media/molt/${rel}`;
        }
      }

      return {
        ...j,
        silentVideoPath,
        silentVideoUrl,
        silentVideoExists,
        narrationAudioUrl,
        narrationAudioExists,
        narratedVideoUrl,
        narratedVideoExists,
        narrationStatus: j.narrationStatus ?? "none",
      };
    });

    // Sort by updatedAt DESC
    enriched.sort((a, b) => {
      const bTime = (b as Record<string, unknown>).updatedAt as string ?? "";
      const aTime = (a as Record<string, unknown>).updatedAt as string ?? "";
      return bTime.localeCompare(aTime);
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
