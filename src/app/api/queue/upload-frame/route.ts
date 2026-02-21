import { NextResponse } from "next/server";

/**
 * Demo-only stub: frame uploads require the automation output directory.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Frame uploads are not available in demo mode" },
    { status: 501 },
  );
}
