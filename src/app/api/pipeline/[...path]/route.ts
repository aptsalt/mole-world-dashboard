import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_URL || "http://localhost:5555";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  const endpoint = "/" + segments.join("/");

  try {
    const res = await fetch(`${FLASK_URL}${endpoint}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Flask returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Flask unreachable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
