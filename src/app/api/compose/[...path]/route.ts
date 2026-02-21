import { NextRequest, NextResponse } from "next/server";

const COMPOSE_API = process.env.COMPOSE_API_URL || "http://localhost:5555";

async function proxyToCompose(
  request: NextRequest,
  segments: string[],
  method: string
) {
  const endpoint = "/api/compose/" + segments.join("/");

  const fetchOptions: RequestInit = {
    method,
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000),
  };

  if (method === "POST" || method === "PUT") {
    const body = await request.text();
    fetchOptions.headers = {
      ...fetchOptions.headers,
      "Content-Type": "application/json",
    };
    fetchOptions.body = body;
  }

  try {
    const res = await fetch(`${COMPOSE_API}${endpoint}`, fetchOptions);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Compose API returned ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Compose API unreachable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  return proxyToCompose(request, segments, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  return proxyToCompose(request, segments, "POST");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  return proxyToCompose(request, segments, "DELETE");
}
