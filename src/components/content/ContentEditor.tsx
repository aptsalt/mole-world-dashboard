"use client";

import { useState } from "react";
import { RefreshCw, Save, Film, Image as ImageIcon, FileText, Mic } from "lucide-react";
import { clsx } from "clsx";

interface ContentPost {
  id: string;
  storyTitle: string;
  storyUrl: string;
  storySource: string;
  caption: string;
  narrationScript: string;
  imagePrompt: string;
  motionPrompt: string;
  imagePath: string;
  videoPath: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentEditorProps {
  post: ContentPost;
  onSave: (id: string, updates: { caption?: string; narrationScript?: string }) => void;
}

type Tab = "preview" | "caption" | "narration" | "prompts";

export default function ContentEditor({ post, onSave }: ContentEditorProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const [caption, setCaption] = useState(post.caption);
  const [narration, setNarration] = useState(post.narrationScript);
  const [saving, setSaving] = useState(false);

  const imageFilename = post.imagePath.split("/").pop() ?? "";
  const videoFilename = post.videoPath?.split("/").pop() ?? "";

  const hasChanges = caption !== post.caption || narration !== post.narrationScript;

  async function handleSave() {
    setSaving(true);
    await onSave(post.id, { caption, narrationScript: narration });
    setSaving(false);
  }

  const tabs: { key: Tab; label: string; icon: typeof Film }[] = [
    { key: "preview", label: "Preview", icon: ImageIcon },
    { key: "caption", label: "Caption", icon: FileText },
    { key: "narration", label: "Narration", icon: Mic },
    { key: "prompts", label: "Prompts", icon: RefreshCw },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white/90">{post.storyTitle}</h3>
          <span className="text-[10px] text-white/40">{post.storySource}</span>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime/20 text-lime text-xs font-medium hover:bg-lime/30 transition-colors disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors",
              tab === t.key
                ? "text-lime border-b-2 border-lime"
                : "text-white/40 hover:text-white/60",
            )}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === "preview" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Image</p>
              {imageFilename ? (
                <img
                  src={`/api/content/media?file=${imageFilename}`}
                  alt={post.storyTitle}
                  className="w-full rounded-lg border border-white/10"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                  <ImageIcon size={32} />
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Video</p>
              {videoFilename ? (
                <video
                  src={`/api/content/media?file=${videoFilename}`}
                  controls
                  className="w-full rounded-lg border border-white/10"
                />
              ) : (
                <div className="w-full aspect-video rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                  <Film size={32} />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "caption" && (
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:border-lime/50 focus:outline-none resize-none"
              placeholder="Social media caption..."
            />
            <div className="flex justify-between mt-2 text-[10px] text-white/40">
              <span>{caption.length} characters</span>
              <span className={caption.length > 280 ? "text-red-400" : ""}>
                X limit: {280 - caption.length} remaining
              </span>
            </div>
          </div>
        )}

        {tab === "narration" && (
          <div>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:border-lime/50 focus:outline-none resize-none"
              placeholder="Video narration script..."
            />
            <p className="text-[10px] text-white/40 mt-2">
              ~{Math.round(narration.split(/\s+/).length / 2.5)}s at speaking pace
            </p>
          </div>
        )}

        {tab === "prompts" && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Image Prompt</p>
              <p className="text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2">{post.imagePrompt || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Motion Prompt</p>
              <p className="text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2">{post.motionPrompt || "—"}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
