import { NextRequest, NextResponse } from "next/server";

const PERPLEXITY_URL = "http://127.0.0.1:18790";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "Missing ?q= parameter" }, { status: 400 });
  }

  const pro = request.nextUrl.searchParams.get("pro") ?? undefined;
  const focus = request.nextUrl.searchParams.get("focus") ?? undefined;

  try {
    const params = new URLSearchParams({ q });
    if (pro) params.set("pro", pro);
    if (focus) params.set("focus", focus);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    const res = await fetch(`${PERPLEXITY_URL}/search?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: body }, { status: res.status });
    }

    // Perplexity server returns plain text — wrap it in a JSON envelope
    const text = await res.text();
    return NextResponse.json({ query: q, result: text });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Search timed out after 120 seconds" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: String(err) },
      { status: 502 }
    );
  }
}
