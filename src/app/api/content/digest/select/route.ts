import { NextResponse } from "next/server";

/**
 * Demo-only stub: story selection requires the automation state directory.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Story selection is not available in demo mode" },
    { status: 501 },
  );
}
