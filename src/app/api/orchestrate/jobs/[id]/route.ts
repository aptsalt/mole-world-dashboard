import { NextResponse } from "next/server";

/**
 * Demo-only stub: job updates require the automation state directory.
 */
export async function PATCH() {
  return NextResponse.json(
    { error: "Job updates are not available in demo mode" },
    { status: 501 },
  );
}
