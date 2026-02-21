import { NextResponse } from "next/server";
import demoContentDigest from "../../../../../data/demo-content-digest.json";

/**
 * Demo-only: returns content digest from demo JSON file.
 * In the full pipeline, this reads from automation/state/ and can spawn the news curator.
 */
export async function GET() {
  return NextResponse.json({ digest: demoContentDigest });
}

export async function POST() {
  return NextResponse.json(
    { error: "News curation is not available in demo mode. The automation backend is required." },
    { status: 501 },
  );
}
