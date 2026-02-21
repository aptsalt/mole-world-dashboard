import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import type { ParsedMdShot, CameraConfig } from "@/lib/types";

function parseCameraLine(line: string): CameraConfig {
  const parts = line.replace(/^\*\*CAMERA:\*\*\s*/, "").split("|").map((s) => s.trim());
  return {
    sensor: parts[0] || "ARRI Alexa 35",
    lens: parts[1] || "Anamorphic",
    focalLength: parts[1]?.match(/\d+mm/)?.[0] || "35mm",
    aperture: parts[2] || "f/2.8",
    movement: parts[3] || "Static",
    genre: parts[4] || "Cinematic",
  };
}

function parseModelLine(line: string): { models: string[]; finalModel: string } {
  const cleaned = line.replace(/^\*\*MODEL:\*\*\s*/, "");
  const models: string[] = [];

  if (cleaned.includes("Hailuo")) models.push("minimax-hailuo-2.3-fast");
  if (cleaned.includes("Kling 2.5T") || cleaned.includes("Kling")) models.push("kling-2.5-turbo");
  if (cleaned.includes("Seedance")) models.push("seedance-1.5-pro");

  let finalModel = "wan-2.5";
  const finalMatch = cleaned.match(/Final:\s*(.+?)(?:\s*\(|$)/);
  if (finalMatch) {
    const raw = finalMatch[1].trim();
    if (raw.includes("WAN")) finalModel = "wan-2.5";
    else if (raw.includes("Sora")) finalModel = "sora-2-queue";
    else if (raw.includes("Kling")) finalModel = "kling-2.5-turbo";
    else finalModel = raw.toLowerCase().replace(/\s+/g, "-");
  }

  return { models: models.length > 0 ? models : ["minimax-hailuo-2.3-fast"], finalModel };
}

function extractCodeBlock(text: string): string {
  const match = text.match(/```\n?([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

function parseMdContent(content: string): ParsedMdShot[] {
  const shots: ParsedMdShot[] = [];
  const shotBlocks = content.split(/### SHOT\s+/);

  for (const block of shotBlocks) {
    if (!block.trim()) continue;

    const headerMatch = block.match(/^(\d+)\s*—\s*(P\d+_S\d+_\d+)\s*\|\s*(\d+)s/);
    if (!headerMatch) continue;

    const shotNumber = parseInt(headerMatch[1], 10);
    const shotId = headerMatch[2];
    const durationSec = parseInt(headerMatch[3], 10);

    const imagePromptMatch = block.match(/\*\*IMAGE PROMPT:\*\*\s*([\s\S]*?)(?=\*\*MOTION PROMPT:\*\*)/);
    const motionPromptMatch = block.match(/\*\*MOTION PROMPT:\*\*\s*([\s\S]*?)(?=\*\*CAMERA:\*\*)/);
    const cameraMatch = block.match(/\*\*CAMERA:\*\*\s*(.+)/);
    const modelMatch = block.match(/\*\*MODEL:\*\*\s*(.+)/);

    const imagePrompt = imagePromptMatch ? extractCodeBlock(imagePromptMatch[1]) : "";
    const motionPrompt = motionPromptMatch ? extractCodeBlock(motionPromptMatch[1]) : "";
    const camera = cameraMatch ? parseCameraLine(cameraMatch[0]) : {
      sensor: "ARRI Alexa 35",
      lens: "Anamorphic",
      focalLength: "35mm",
      aperture: "f/2.8",
      movement: "Static",
      genre: "Cinematic",
    };
    const { models, finalModel } = modelMatch
      ? parseModelLine(modelMatch[0])
      : { models: ["minimax-hailuo-2.3-fast"], finalModel: "wan-2.5" };

    shots.push({
      shotNumber,
      shotId,
      durationSec,
      imagePrompt,
      motionPrompt,
      camera,
      models,
      finalModel,
    });
  }

  return shots;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filePath } = body as { content?: string; filePath?: string };

    let mdContent: string;

    if (content) {
      mdContent = content;
    } else if (filePath) {
      const resolved = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(resolved)) {
        return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
      }
      mdContent = fs.readFileSync(resolved, "utf-8");
    } else {
      return NextResponse.json({ error: "Provide content or filePath" }, { status: 400 });
    }

    const shots = parseMdContent(mdContent);
    return NextResponse.json({ shots, count: shots.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
