import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text: string; mediaPath?: string };
    const { text, mediaPath } = body;

    if (!text || text.length === 0) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (text.length > 280) {
      return NextResponse.json({ error: "Tweet exceeds 280 characters" }, { status: 400 });
    }

    // Spawn a one-shot script that imports postToX and runs it
    const scriptContent = `
      import { postToX } from "./automation/src/social/x-poster.js";
      const result = await postToX(${JSON.stringify(text)}, ${mediaPath ? JSON.stringify(mediaPath) : "null"}, null);
      console.log(JSON.stringify(result));
    `;

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn("npx", ["tsx", "--eval", scriptContent], {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => { stdout += data; });
      child.stderr.on("data", (data) => { stderr += data; });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Tweet post timed out"));
      }, 60_000);

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(`Post script failed: ${stderr}`));
        else resolve(stdout);
      });
    });

    // Parse the last JSON line from stdout
    const lines = result.trim().split("\n");
    const lastJson = lines.reverse().find((l) => l.startsWith("{"));
    if (!lastJson) {
      return NextResponse.json({ error: "No result from post script" }, { status: 500 });
    }

    const postResult = JSON.parse(lastJson) as { success: boolean; postUrl: string | null; error: string | null };
    if (!postResult.success) {
      return NextResponse.json({ error: postResult.error ?? "Post failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, postUrl: postResult.postUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
