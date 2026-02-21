import { NextResponse } from "next/server";
import demoContentQueue from "../../../../../data/demo-content-queue.json";

/**
 * Demo-only: returns content queue from demo JSON file.
 */
export async function GET() {
  return NextResponse.json(demoContentQueue);
}

export async function POST() {
  return NextResponse.json(
    { error: "Adding to the content queue is not available in demo mode" },
    { status: 501 },
  );
}
