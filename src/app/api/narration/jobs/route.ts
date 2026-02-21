import { NextResponse } from "next/server";

/**
 * Demo-only stub: returns empty narration jobs list.
 */
export async function GET() {
  return NextResponse.json([]);
}
