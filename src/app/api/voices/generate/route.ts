import { NextResponse } from "next/server";

/**
 * Demo-only stub: voice generation requires the automation backend with F5-TTS.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Voice generation is not available in demo mode. The automation backend with F5-TTS is required." },
    { status: 501 },
  );
}
