"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Upload, Replace, Plus, Loader2 } from "lucide-react";
import type { ParsedMdShot } from "@/lib/types";

interface MdImportPanelProps {
  onImport: (shots: ParsedMdShot[], mode: "append" | "replace") => void;
}

export function MdImportPanel({ onImport }: MdImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [mdContent, setMdContent] = useState("");
  const [filePath, setFilePath] = useState("docs/higgsfield-production/18-ALL-89-SHOTS-HIGGSFIELD-PROMPTS.md");
  const [parsed, setParsed] = useState<ParsedMdShot[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"content" | "file">("file");

  const handleParse = async () => {
    setParsing(true);
    setError(null);
    setParsed([]);

    try {
      const payload = mode === "content" ? { content: mdContent } : { filePath };
      const res = await fetch("/api/queue/parse-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Parse failed");
        return;
      }

      setParsed(data.shots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <FileText size={16} className="text-cyan" />
        <span className="text-sm font-medium text-white">Import from Markdown</span>
        <span className="ml-auto text-muted">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("file")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "file" ? "bg-cyan/10 text-cyan border border-cyan/20" : "text-muted border border-white/[0.08] hover:text-white"
              }`}
            >
              File Path
            </button>
            <button
              onClick={() => setMode("content")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "content" ? "bg-cyan/10 text-cyan border border-cyan/20" : "text-muted border border-white/[0.08] hover:text-white"
              }`}
            >
              Paste Content
            </button>
          </div>

          {mode === "file" ? (
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Path to MD file relative to project root"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan/30"
            />
          ) : (
            <textarea
              value={mdContent}
              onChange={(e) => setMdContent(e.target.value)}
              placeholder="Paste markdown content here..."
              rows={6}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan/30 resize-y font-mono"
            />
          )}

          <button
            onClick={handleParse}
            disabled={parsing || (mode === "content" ? !mdContent.trim() : !filePath.trim())}
            className="flex items-center gap-2 rounded-lg bg-cyan/10 border border-cyan/20 px-4 py-2 text-xs font-medium text-cyan transition-all hover:bg-cyan/20 disabled:opacity-40"
          >
            {parsing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {parsing ? "Parsing..." : "Parse Markdown"}
          </button>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {parsed.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-muted mb-2">
                  Parsed <span className="text-cyan font-medium">{parsed.length}</span> shots
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {parsed.slice(0, 10).map((shot) => (
                    <div key={shot.shotId} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-cyan">{shot.shotId}</span>
                      <span className="text-muted truncate">{shot.imagePrompt.slice(0, 60)}...</span>
                      <span className="ml-auto text-white/40">{shot.durationSec}s</span>
                    </div>
                  ))}
                  {parsed.length > 10 && (
                    <p className="text-[11px] text-muted">...and {parsed.length - 10} more</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onImport(parsed, "append")}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-white transition-colors hover:bg-white/[0.08]"
                >
                  <Plus size={13} />
                  Append to Queue
                </button>
                <button
                  onClick={() => onImport(parsed, "replace")}
                  className="flex items-center gap-1.5 rounded-lg border border-amber/20 bg-amber/10 px-4 py-2 text-xs text-amber transition-colors hover:bg-amber/20"
                >
                  <Replace size={13} />
                  Replace Queue
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
