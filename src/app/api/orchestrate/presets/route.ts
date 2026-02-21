import { NextResponse } from "next/server";

/**
 * Demo-only stub: returns empty presets.
 */
export async function GET() {
  return NextResponse.json({ categories: [], presets: [] });
}

export async function POST() {
  return NextResponse.json(
    { error: "Preset saving is not available in demo mode" },
    { status: 501 },
  );
}
