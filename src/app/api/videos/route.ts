import { NextResponse } from "next/server";
import demoVideos from "../../../../data/demo-videos.json";

/**
 * Demo-only: returns video data from demo JSON file.
 * In the full pipeline, this scans automation/output/ for rendered .mp4 files.
 */
export async function GET() {
  return NextResponse.json(demoVideos);
}
