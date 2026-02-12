"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, ArrowLeftRight, Play, Pause } from "lucide-react";
import { getSceneColor } from "@/lib/utils";
import { getVideoUrl } from "@/lib/api";
import type { Clip } from "@/lib/types";

interface ComparisonProps {
  clip: Clip;
  onClose: () => void;
}

export function ClipComparison({ clip, onClose }: ComparisonProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const v1Ref = useRef<HTMLVideoElement>(null);
  const v2Ref = useRef<HTMLVideoElement>(null);
  const dragging = useRef(false);
  const [playing, setPlaying] = useState(false);
  const sceneColor = getSceneColor(clip.scene_id);

  const v1Url = clip.v1_clip?.relative_path ? getVideoUrl(clip.v1_clip.relative_path) : null;
  const v2Url = clip.clip?.relative_path ? getVideoUrl(clip.clip.relative_path) : null;

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(2, Math.min(98, x)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  }, [handleMove]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) handleMove(e.clientX);
  }, [handleMove]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const togglePlay = useCallback(() => {
    const v1 = v1Ref.current;
    const v2 = v2Ref.current;
    if (playing) {
      v1?.pause();
      v2?.pause();
      setPlaying(false);
    } else {
      // Sync start times
      if (v1 && v2) {
        v2.currentTime = v1.currentTime;
      }
      v1?.play().catch(() => {});
      v2?.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, togglePlay]);

  // Pause videos on unmount
  useEffect(() => {
    return () => {
      v1Ref.current?.pause();
      v2Ref.current?.pause();
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 400 }}>
      <div
        className="relative w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArrowLeftRight size={16} className="text-cyan" />
            <h2 className="text-sm font-semibold text-white">
              V1 vs V2 Comparison
            </h2>
            <code className="text-xs font-mono text-cyan bg-cyan/10 px-2 py-0.5 rounded">
              {clip.shot_id}
            </code>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
            >
              <span className="kbd">ESC</span>
              Close
            </button>
          </div>
        </div>

        {/* Comparison container */}
        <div
          ref={containerRef}
          className="relative aspect-video rounded-2xl overflow-hidden border border-white/[0.08] cursor-col-resize select-none bg-black"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* V1 Side (full background) */}
          <div className="absolute inset-0">
            {v1Url ? (
              <video
                ref={v1Ref}
                src={v1Url}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a0a20] via-[#121228] to-[#0a0a20]">
                <p className="text-sm text-blue-400/60">V1 not available</p>
              </div>
            )}
          </div>

          {/* V2 Side (clipped) */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            {v2Url ? (
              <video
                ref={v2Ref}
                src={v2Url}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0f0a1a] via-[#1a1028] to-[#0f0a1a]">
                <p className="text-sm text-amber/60">V2 not available</p>
              </div>
            )}
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
          >
            <div className="h-full w-0.5 bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-white/90 shadow-lg cursor-col-resize">
              <ArrowLeftRight size={16} className="text-black" />
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 z-10">
            <span className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-400">
              V1 Standard
            </span>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <span className="rounded-lg bg-amber/20 border border-amber/30 px-3 py-1.5 text-xs font-semibold text-amber">
              V2 Enhanced
            </span>
          </div>

          {/* Scene indicator */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: sceneColor }} />
            <span className="text-xs text-white/60">{clip.scene_id}</span>
          </div>
        </div>

        {/* Enhancement details */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="glass p-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <div className="flex-1">
              <p className="text-[10px] text-muted uppercase tracking-wider">V1 Standard</p>
              <p className="text-xs text-white mt-0.5">
                {clip.v1_clip ? `${clip.v1_clip.size_kb.toFixed(0)} KB` : "Not available"}
              </p>
            </div>
          </div>
          <div className="glass p-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-amber" />
            <div className="flex-1">
              <p className="text-[10px] text-muted uppercase tracking-wider">V2 Enhanced</p>
              <p className="text-xs text-white mt-0.5">
                {clip.clip ? `${clip.clip.size_kb.toFixed(0)} KB` : "Not available"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
