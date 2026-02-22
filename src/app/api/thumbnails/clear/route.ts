import { NextResponse } from "next/server";
import { rm, stat } from "fs/promises";
import { join } from "path";

const THUMB_CACHE_DIR = join(process.cwd(), "automation", ".thumbcache");

export async function POST() {
  try {
    await stat(THUMB_CACHE_DIR);
    await rm(THUMB_CACHE_DIR, { recursive: true });
    return NextResponse.json({ ok: true, message: "Thumbnail cache cleared" });
  } catch {
    return NextResponse.json({ ok: true, message: "No cache to clear" });
  }
}
