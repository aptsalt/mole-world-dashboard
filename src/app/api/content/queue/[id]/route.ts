import { NextResponse } from "next/server";

/**
 * Demo-only stub: queue item updates require the automation state directory.
 */
export async function PATCH() {
  return NextResponse.json(
    { error: "Queue updates are not available in demo mode" },
    { status: 501 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Queue deletion is not available in demo mode" },
    { status: 501 },
  );
}
