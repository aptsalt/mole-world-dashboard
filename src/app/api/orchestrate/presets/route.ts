import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const PRESETS_PATH = path.resolve(process.cwd(), "automation", "state", "prompt-presets.json");

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function GET() {
  try {
    if (!fs.existsSync(PRESETS_PATH)) {
      return NextResponse.json({ categories: [], presets: [] });
    }
    const data = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name: string;
      category: string;
      prompt: string;
      tags?: string[];
    };

    if (!body.name || !body.category || !body.prompt) {
      return NextResponse.json({ error: "name, category, and prompt are required" }, { status: 400 });
    }

    ensureDir(PRESETS_PATH);
    let data = { categories: [] as string[], presets: [] as Array<Record<string, unknown>> };
    if (fs.existsSync(PRESETS_PATH)) {
      try {
        data = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
      } catch { /* start fresh */ }
    }

    const preset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: body.name,
      category: body.category,
      prompt: body.prompt,
      tags: body.tags ?? [],
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    data.presets.push(preset);

    // Ensure category exists
    if (!data.categories.includes(body.category)) {
      data.categories.push(body.category);
    }

    const tmpFile = PRESETS_PATH + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFile, PRESETS_PATH);

    return NextResponse.json(preset, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
