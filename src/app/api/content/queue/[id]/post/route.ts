import { NextResponse } from "next/server";

/**
 * Demo-only stub: scheduling posts requires the automation state directory.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Post scheduling is not available in demo mode" },
    { status: 501 },
  );
}
