import { NextResponse } from "next/server";

/**
 * Demo-only stub: script generation requires Ollama via the automation backend.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Script generation is not available in demo mode. The automation backend with Ollama is required." },
    { status: 501 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Script saving is not available in demo mode." },
    { status: 501 },
  );
}
