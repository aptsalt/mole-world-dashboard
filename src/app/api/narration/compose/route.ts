import { NextResponse } from "next/server";

/**
 * Demo-only stub: narration composition requires the automation backend.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Narration composition is not available in demo mode. The automation backend is required." },
    { status: 501 },
  );
}
