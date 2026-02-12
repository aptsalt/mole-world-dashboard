"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipBack, SkipForward,
  X, Volume2, VolumeX,
} from "lucide-react";
import { getSceneColor } from "@/lib/utils";

export interface MiniPlayerClip {
  shotId: string;
  sceneId: string;
  source?: string;
  videoUrl?: string;
  audioUrl?: string;
}

interface MiniPlayerState {
  clip: MiniPlayerClip | null;
  playlist: MiniPlayerClip[];
}

// Simple global state for mini player — avoids prop drilling through AppShell
const listeners = new Set<() => void>();
let playerState: MiniPlayerState = { clip: null, playlist: [] };

export function openMiniPlayer(clip: MiniPlayerClip, playlist?: MiniPlayerClip[]) {
  playerState = { clip, playlist: playlist ?? [clip] };
  listeners.forEach((fn) => fn());
}

export function closeMiniPlayer() {
  playerState = { clip: null, playlist: [] };
  listeners.forEach((fn) => fn());
}

function useMiniPlayerState() {
  const [state, setState] = useState<MiniPlayerState>(playerState);

  useEffect(() => {
    const listener = () => setState({ ...playerState });
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return state;
}

export function MiniPlayer() {
  const { clip, playlist } = useMiniPlayerState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);

  // Sync play/pause state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
    };
  }, [clip?.shotId]);

  // Reset when clip changes
  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [clip?.shotId]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch((err) => {
        console.warn("[MiniPlayer] play failed:", err.message);
      });
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((pct: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = (pct / 100) * video.duration;
  }, []);

  const navigatePlaylist = useCallback((direction: -1 | 1) => {
    if (!clip || playlist.length <= 1) return;
    const currentIdx = playlist.findIndex((c) => c.shotId === clip.shotId);
    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < playlist.length) {
      playerState = { clip: playlist[nextIdx], playlist };
      listeners.forEach((fn) => fn());
    }
  }, [clip, playlist]);

  if (!clip) return null;

  const sceneColor = getSceneColor(clip.sceneId);
  const hasVideo = !!clip.videoUrl;

  return (
    <div className="mini-player">
      {/* Progress bar at top of player */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-white/[0.06] cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          seekTo(Math.max(0, Math.min(100, pct)));
        }}
      >
        <div
          className="h-full transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%`, background: sceneColor }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Clip thumbnail — this IS the playback video element */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${sceneColor}20, ${sceneColor}08)` }}
          >
            {hasVideo ? (
              <video
                ref={videoRef}
                key={clip.videoUrl}
                src={clip.videoUrl}
                muted={muted}
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-2 w-2 rounded-full" style={{ background: sceneColor, opacity: 0.5 }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{clip.shotId}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted">{clip.sceneId}</span>
              {clip.source && (
                <span className={`badge ${clip.source === "v2" ? "badge-v2" : "badge-v1"}`}>
                  {clip.source === "v2" ? "V2" : "V1"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigatePlaylist(-1)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted hover:text-white transition-colors"
            aria-label="Previous"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.1] text-white hover:bg-white/[0.12] transition-all"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button
            onClick={() => navigatePlaylist(1)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted hover:text-white transition-colors"
            aria-label="Next"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Time */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-muted min-w-[80px]">
          <span>{currentTime.toFixed(1)}s</span>
          <span className="text-white/20">/</span>
          <span>{duration > 0 ? duration.toFixed(1) : "--"}s</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-white transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={() => closeMiniPlayer()}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-white transition-colors"
            aria-label="Close player"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
