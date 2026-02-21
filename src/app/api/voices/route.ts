import { NextResponse } from "next/server";
import demoVoices from "../../../../data/demo-voices.json";

/**
 * Demo-only: returns voice data from demo JSON file.
 */
export async function GET() {
  return NextResponse.json(demoVoices);
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Voice quality updates are not available in demo mode" },
    { status: 501 },
  );
}
