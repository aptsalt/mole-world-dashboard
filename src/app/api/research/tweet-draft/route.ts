import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen3:14b";

const TWEET_PROMPT = `You are a tech-savvy social media manager. Write a tweet about the following content.

Rules:
- Max 280 characters
- Include 1-2 relevant hashtags
- Make it engaging, witty, and shareable
- Do NOT use emojis excessively (0-2 max)
- Sound human, not corporate
- If there's a URL, leave room for it (assume 23 chars for URLs)

Output ONLY the tweet text. No quotes, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title: string;
      content: string;
      url: string;
      platform: string;
    };

    const prompt = `${TWEET_PROMPT}\n\nSource (${body.platform}):\nTitle: ${body.title}\nContent: ${body.content.slice(0, 500)}\nURL: ${body.url}`;

    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Ollama failed: ${res.status} ${text}` }, { status: 502 });
    }

    const data = (await res.json()) as { response: string };
    // Clean thinking tags and trim
    const draft = data.response
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    return NextResponse.json({ draft, charCount: draft.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
