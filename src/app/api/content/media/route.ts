import { NextRequest, NextResponse } from "next/server";

/**
 * Demo-only stub: content media serving requires local file system access.
 */
export async function GET(request: NextRequest) {
  return new NextResponse("Not found — media serving requires the automation backend", { status: 404 });
}
