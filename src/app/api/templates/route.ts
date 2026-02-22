import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { join } from "path";

const STATE_DIR = join(process.cwd(), "automation", "state");
const TEMPLATES_FILE = join(STATE_DIR, "templates.json");

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string; // image, clip, lesson, chat
  pipeline: string; // local_gpu, higgsfield, content
  prompt: string; // supports {{VARIABLE}} placeholders
  imageModelAlias?: string;
  videoModelAlias?: string;
  voiceKey?: string;
  narrationMode?: string;
  bgmPresetKey?: string;
  bgmVolume?: number;
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

async function readTemplates(): Promise<Template[]> {
  try {
    const data = await readFile(TEMPLATES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTemplates(templates: Template[]) {
  await mkdir(STATE_DIR, { recursive: true });
  const tmp = TEMPLATES_FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(templates, null, 2));
  await rename(tmp, TEMPLATES_FILE);
}

export async function GET() {
  const templates = await readTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const templates = await readTemplates();

  const template: Template = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: body.name || "Untitled Template",
    description: body.description || "",
    category: body.category || "general",
    type: body.type || "clip",
    pipeline: body.pipeline || "higgsfield",
    prompt: body.prompt || "",
    imageModelAlias: body.imageModelAlias,
    videoModelAlias: body.videoModelAlias,
    voiceKey: body.voiceKey,
    narrationMode: body.narrationMode,
    bgmPresetKey: body.bgmPresetKey,
    bgmVolume: body.bgmVolume,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useCount: 0,
  };

  templates.push(template);
  await writeTemplates(templates);

  return NextResponse.json(template, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  let templates = await readTemplates();
  templates = templates.filter((t) => t.id !== id);
  await writeTemplates(templates);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const templates = await readTemplates();
  const idx = templates.findIndex((t) => t.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Increment use count if that's the action
  if (body.action === "use") {
    templates[idx].useCount++;
    templates[idx].updatedAt = new Date().toISOString();
  } else {
    // Update template fields
    Object.assign(templates[idx], body, { updatedAt: new Date().toISOString() });
  }

  await writeTemplates(templates);
  return NextResponse.json(templates[idx]);
}
