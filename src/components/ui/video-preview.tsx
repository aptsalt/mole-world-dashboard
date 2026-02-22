"use client";

import { useRef, useState, useCallback, memo } from "react";
import { Play, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { clsx } from "clsx";

interface VideoPreviewProps {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "auto";
  showControls?: boolean;
  onExpand?: () => void;
}

export const VideoPreview = memo(function VideoPreview({
  src,
  poster,
  alt = "Video preview",
  className,
  aspectRatio = "video",
  showControls = true,
  onExpand,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleMouseEnter = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const handleMouseLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand?.();
  }, [onExpand]);

  const aspectClass =
    aspectRatio === "video" ? "aspect-video" :
    aspectRatio === "square" ? "aspect-square" :
    "";

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-lg bg-black/20 cursor-pointer",
        aspectClass,
        className,
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        playsInline
        preload="metadata"
        onLoadedData={() => setIsLoaded(true)}
        className="h-full w-full object-cover"
        aria-label={alt}
      />

      {/* Play icon overlay (shown when not playing) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play size={18} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}

      {/* Controls overlay (shown on hover when playing) */}
      {showControls && isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleMute}
            className="rounded p-1 text-white/80 hover:text-white transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          {onExpand && (
            <button
              onClick={handleExpand}
              className="rounded p-1 text-white/80 hover:text-white transition-colors"
              aria-label="Expand video"
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      )}
    </div>
  );
});
