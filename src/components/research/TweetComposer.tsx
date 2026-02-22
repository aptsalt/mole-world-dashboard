"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import type { ResearchItem } from "./research-types";

interface TweetComposerProps {
  item: ResearchItem;
  onClose: () => void;
}

type PostStatus = "idle" | "drafting" | "posting" | "success" | "error";

export default function TweetComposer({ item, onClose }: TweetComposerProps) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<PostStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);

  const charCount = draft.length;
  const isOverLimit = charCount > 280;

  // Auto-generate draft on mount
  useEffect(() => {
    generateDraft();
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateDraft() {
    setStatus("drafting");
    setError(null);
    try {
      const res = await fetch("/api/research/tweet-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          content: item.content,
          url: item.url,
          platform: item.platform,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      const data = (await res.json()) as { draft: string };
      setDraft(data.draft);
      setStatus("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
      // Prefill with a simple draft as fallback
      setDraft(`${item.title.slice(0, 200)}\n\n${item.url}`);
    }
  }

  async function handlePost() {
    if (isOverLimit || !draft.trim()) return;
    setStatus("posting");
    setError(null);
    try {
      const res = await fetch("/api/research/tweet-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Post failed");
      setPostUrl(data.postUrl);
      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[440px] bg-bg-light border-l border-white/[0.08] shadow-2xl flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <h3 className="text-sm font-semibold text-text">Compose Tweet</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Source context */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 uppercase font-semibold">
            {item.platform}
          </span>
          {item.author && (
            <span className="text-[10px] text-white/40">@{item.author}</span>
          )}
        </div>
        <p className="text-xs text-white/60 line-clamp-2">{item.title}</p>
        {(item.metrics.views > 0 || item.metrics.likes > 0) && (
          <div className="flex gap-3 mt-1 text-[10px] text-white/30">
            {item.metrics.views > 0 && <span>{item.metrics.views.toLocaleString()} views</span>}
            {item.metrics.likes > 0 && <span>{item.metrics.likes.toLocaleString()} likes</span>}
          </div>
        )}
      </div>

      {/* Textarea */}
      <div className="flex-1 p-5">
        <textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setStatus("idle"); }}
          placeholder="Type your tweet..."
          className="w-full h-48 bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-sm text-white resize-none outline-none placeholder:text-white/30 focus:border-white/20 transition-colors"
          disabled={status === "drafting" || status === "posting"}
        />
        <div className="flex items-center justify-between mt-2">
          <span
            className={clsx(
              "text-xs font-mono",
              isOverLimit ? "text-red-400" : charCount > 260 ? "text-amber-400" : "text-white/30",
            )}
          >
            {charCount}/280
          </span>
          <button
            onClick={generateDraft}
            disabled={status === "drafting" || status === "posting"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={clsx(status === "drafting" && "animate-spin")} />
            Regenerate
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 size={14} className="text-green-400 shrink-0" />
            <div className="text-xs text-green-400">
              Tweet posted!
              {postUrl && (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline hover:text-green-300"
                >
                  View on X
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-white/[0.08] flex items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-lg text-xs font-medium text-white/50 bg-white/5 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePost}
          disabled={isOverLimit || !draft.trim() || status === "posting" || status === "success"}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-lime text-btn-text hover:bg-lime/80 transition-colors disabled:opacity-50"
        >
          {status === "posting" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {status === "posting" ? "Posting..." : "Post to X"}
        </button>
      </div>
    </div>
  );
}
