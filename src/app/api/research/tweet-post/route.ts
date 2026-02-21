import { NextResponse } from "next/server";

/**
 * Demo-only stub: posting tweets requires the automation backend with X API credentials.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Tweet posting is not available in demo mode. The automation backend with X API credentials is required." },
    { status: 501 },
  );
}
