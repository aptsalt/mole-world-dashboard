import { NextResponse } from "next/server";

// Mirror of CONFIG.modelAliases — kept in sync manually
// These are the free unlimited models available on Higgsfield
const IMAGE_MODELS: Record<string, { alias: string; name: string; description: string }> = {
  a: { alias: "a", name: "nano-banana-pro", description: "Google flagship — best all-rounder" },
  b: { alias: "b", name: "seedream-4.5", description: "ByteDance 4K — artistic, stylized" },
  c: { alias: "c", name: "flux-2-pro", description: "Speed + detail" },
  d: { alias: "d", name: "higgsfield-soul", description: "Ultra-realistic fashion" },
  e: { alias: "e", name: "kling-o1", description: "Photorealistic scenes" },
  f: { alias: "f", name: "nano-banana", description: "Google standard" },
  g: { alias: "g", name: "flux-2-flex", description: "Next-gen flexible" },
  h: { alias: "h", name: "seedream-4.0", description: "ByteDance editing" },
  i: { alias: "i", name: "z-image", description: "Lifelike portraits" },
  j: { alias: "j", name: "gpt-image", description: "Versatile text-to-image" },
  k: { alias: "k", name: "reve", description: "Advanced editing" },
  l: { alias: "l", name: "multi-reference", description: "Multi-edit composite" },
  m: { alias: "m", name: "higgsfield-face-swap", description: "Face swapping" },
};

const VIDEO_MODELS: Record<string, { alias: string; name: string; description: string }> = {
  a: { alias: "a", name: "kling-2.5-turbo", description: "Fast unlimited (default)" },
  b: { alias: "b", name: "minimax-hailuo-2.3-fast", description: "Different style" },
  c: { alias: "c", name: "seedance-1.5-pro", description: "Seedance style" },
};

export async function GET() {
  return NextResponse.json({
    image: Object.values(IMAGE_MODELS),
    video: Object.values(VIDEO_MODELS),
    defaults: { image: "a", video: "a" },
  });
}
