"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { create } from "zustand";
import {
  Play, Pause, SkipBack, SkipForward,
  X, Volume2, VolumeX, AlertCircle, Loader2,
} from "lucide-react";
import { getSceneColor } from "@/lib/utils";

export interface MiniPlayerClip {
  shotId: string;
  sceneId: string;
  source?: string;
  videoUrl?: string;
  audioUrl?: string;
}

// Zustand store — survives HMR, no stale listener issues
interface MiniPlayerStore {
  clip: MiniPlayerClip | null;
  playlist: MiniPlayerClip[];
  open: (clip: MiniPlayerClip, playlist?: MiniPlayerClip[]) => void;
  close: () => void;
  navigate: (direction: -1 | 1) => void;
}

const useMiniPlayerStore = create<MiniPlayerStore>((set, get) => ({
  clip: null,
  playlist: [],
  open: (clip, playlist) => set({ clip, playlist: playlist ?? [clip] }),
  close: () => set({ clip: null, playlist: [] }),
  navigate: (direction) => {
    const { clip, playlist } = get();
    if (!clip || playlist.length <= 1) return;
    const idx = playlist.findIndex((c) => c.shotId === clip.shotId);
    const next = idx + direction;
    if (next >= 0 && next < playlist.length) {
      set({ clip: playlist[next] });
    }
  },
}));

// Public API — importable from anywhere without prop drilling
export function openMiniPlayer(clip: MiniPlayerClip, playlist?: MiniPlayerClip[]) {
  useMiniPlayerStore.getState().open(clip, playlist);
}

export function closeMiniPlayer() {
  useMiniPlayerStore.getState().close();
}

type VideoStatus = "loading" | "ready" | "error" | "playing" | "paused";

export function MiniPlayer() {
  const { clip, playlist, navigate, close } = useMiniPlayerStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<VideoStatus>("loading");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const prevShotRef = useRef<string | null>(null);

  // Load video source and attach event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clip?.videoUrl) return;

    // Compare using URL to handle relative vs absolute
    const currentSrc = video.getAttribute("src") || "";
    if (currentSrc !== clip.videoUrl) {
      video.setAttribute("src", clip.videoUrl);
      video.load();
    }

    const onCanPlay = () => {
      setStatus((s) => s === "playing" ? s : "ready");
      setErrorMsg("");
    };
    const onPlay = () => setStatus("playing");
    const onPause = () => {
      setStatus((s) => s === "loading" ? s : "paused");
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onEnded = () => {
      setStatus("paused");
      setProgress(0);
      setCurrentTime(0);
      video.currentTime = 0;
    };
    const onError = () => {
      const err = video.error;
      if (err) {
        const messages: Record<number, string> = {
          1: "Video loading aborted",
          2: "Network error — video unavailable",
          3: "Video decode failed",
          4: "Video format not supported",
        };
        setErrorMsg(messages[err.code] ?? "Video unavailable");
      } else {
        setErrorMsg("Video unavailable");
      }
      setStatus("error");
    };
    const onWaiting = () => setStatus("loading");
    const onPlaying = () => setStatus("playing");

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, [clip?.shotId, clip?.videoUrl]);

  // Reset state and auto-play when clip changes
  useEffect(() => {
    if (!clip) return;

    const isNewClip = prevShotRef.current !== clip.shotId;
    prevShotRef.current = clip.shotId;

    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setErrorMsg("");
    setStatus("loading");

    if (!clip.videoUrl) {
      setStatus("error");
      setErrorMsg("No video file available");
      return;
    }

    if (isNewClip) {
      const video = videoRef.current;
      if (!video) return;

      const tryAutoPlay = () => {
        video.muted = true;
        video.play().then(() => {
          setStatus("playing");
        }).catch(() => {
          setStatus("ready");
        });
      };

      if (video.readyState >= 3) {
        tryAutoPlay();
      } else {
        const onReady = () => {
          video.removeEventListener("canplay", onReady);
          tryAutoPlay();
        };
        video.addEventListener("canplay", onReady);
      }
    }
  }, [clip?.shotId, clip?.videoUrl]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      setErrorMsg("Player not ready");
      setStatus("error");
      return;
    }
    if (status === "error") return;

    if (video.paused) {
      video.play().then(() => {
        setStatus("playing");
      }).catch((err) => {
        setErrorMsg(err.message || "Playback failed");
        setStatus("error");
      });
    } else {
      video.pause();
    }
  }, [status]);

  const seekTo = useCallback((pct: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = (pct / 100) * video.duration;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
  }, [muted]);

  if (!clip) return null;

  const sceneColor = getSceneColor(clip.sceneId);
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const isError = status === "error";

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
        {/* Clip thumbnail with video playback */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="relative flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${sceneColor}20, ${sceneColor}08)` }}
          >
            <video
              ref={videoRef}
              muted={muted}
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={14} className="text-white animate-spin" />
              </div>
            )}
            {isError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <AlertCircle size={12} className="text-red-400" />
              </div>
            )}
            {isPlaying && (
              <div
                className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: sceneColor }}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{clip.shotId}</p>
            <div className="flex items-center gap-2">
              {isError ? (
                <span className="text-[10px] text-red-400 truncate max-w-[140px]" title={errorMsg}>
                  {errorMsg}
                </span>
              ) : (
                <>
                  <span className="text-[10px] text-muted">{clip.sceneId}</span>
                  {clip.source && (
                    <span className={`badge ${clip.source === "v2" ? "badge-v2" : "badge-v1"}`}>
                      {clip.source === "v2" ? "V2" : "V1"}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted hover:text-white transition-colors"
            aria-label="Previous"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`h-10 w-10 flex items-center justify-center rounded-full border text-white transition-all ${
              isError
                ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                : isPlaying
                  ? "bg-white/[0.12] border-white/[0.15]"
                  : "bg-white/[0.08] border-white/[0.1] hover:bg-white/[0.12]"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} className="ml-0.5" />
            )}
          </button>
          <button
            onClick={() => navigate(1)}
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
            onClick={toggleMute}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-white transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={() => close()}
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
