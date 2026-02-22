/**
 * Helper to run TypeScript code in the automation project context.
 *
 * `tsx -e` runs eval'd code in CJS context, which breaks ESM imports
 * even when package.json has `"type": "module"`. Writing a temp .ts file
 * and running `tsx <file>` properly respects the package.json setting.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const AUTOMATION_DIR = path.resolve(process.cwd(), "automation");

export interface TsxResult {
  ok: boolean;
  [key: string]: unknown;
}

/**
 * Write a temp .ts file in automation/ root (NOT a subdirectory),
 * so relative imports like `./src/...` resolve correctly.
 * Execute it with tsx, parse the last JSON line from stdout, and clean up.
 */
export function runTsx(
  scriptBody: string,
  opts: { timeoutMs?: number } = {},
): Promise<TsxResult> {
  const timeout = opts.timeoutMs ?? 120_000;

  // File must be in automation/ root so ./src/ imports resolve correctly
  const tmpFile = path.join(AUTOMATION_DIR, `_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ts`);
  fs.writeFileSync(tmpFile, scriptBody, "utf-8");

  return new Promise<TsxResult>((resolve) => {
    execFile("npx", ["tsx", tmpFile], {
      cwd: AUTOMATION_DIR,
      timeout,
    }, (err, stdout, stderr) => {
      // Always clean up temp file
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

      const out = stdout?.toString().trim() ?? "";

      // Try to parse the last JSON line from stdout (Ollama/TTS may print warnings before it)
      const lines = out.split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed && typeof parsed === "object" && parsed.ok) {
            resolve(parsed as TsxResult);
            return;
          }
        } catch { /* not JSON, skip */ }
      }

      if (err) {
        resolve({ ok: false, error: stderr?.toString().slice(-500) || err.message });
      } else {
        resolve({ ok: false, error: `No JSON output. stdout: ${out.slice(-300)}` });
      }
    });
  });
}
