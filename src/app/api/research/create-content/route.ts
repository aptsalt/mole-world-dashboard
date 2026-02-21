import { NextResponse } from "next/server";

/**
 * Demo-only stub: creating content from research requires the automation state directory.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Content creation from research is not available in demo mode" },
    { status: 501 },
  );
}
