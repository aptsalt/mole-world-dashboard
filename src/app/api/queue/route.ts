import { NextResponse } from "next/server";
import demoQueue from "../../../../data/demo-queue.json";

/**
 * Demo-only: returns queue from demo JSON file.
 */
export async function GET() {
  return NextResponse.json(demoQueue);
}

export async function POST() {
  return NextResponse.json(
    { error: "Queue updates are not available in demo mode" },
    { status: 501 },
  );
}
