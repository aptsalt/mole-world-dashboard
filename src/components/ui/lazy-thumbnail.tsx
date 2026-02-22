"use client";

import { useState, useRef, useEffect, memo } from "react";
import { clsx } from "clsx";
import { getThumbnailUrl } from "@/lib/thumbnails";

interface LazyThumbnailProps {
  src: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbackSrc?: string;
}

export const LazyThumbnail = memo(function LazyThumbnail({
  src,
  alt = "",
  size = "md",
  className,
  fallbackSrc,
}: LazyThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const thumbUrl = getThumbnailUrl(src, size);
  const actualSrc = error && fallbackSrc ? fallbackSrc : isVisible ? thumbUrl : undefined;

  return (
    <div className={clsx("relative overflow-hidden bg-white/[0.02]", className)}>
      {/* Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 skeleton" />
      )}
      <img
        ref={imgRef}
        src={actualSrc}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          if (fallbackSrc) setLoaded(false);
        }}
        className={clsx(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        loading="lazy"
      />
    </div>
  );
});
