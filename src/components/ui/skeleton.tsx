"use client";

import { clsx } from "clsx";

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={clsx("skeleton h-3 rounded", className)} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton rounded-full shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-xl", className)} />;
}

/** Header card skeleton matching the glass glow-cyan hero cards */
export function SkeletonHeroCard() {
  return (
    <div className="glass p-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <SkeletonCircle size={48} />
        <div className="flex-1 space-y-3">
          <SkeletonLine className="w-48 h-5" />
          <SkeletonLine className="w-72 h-3" />
          <div className="flex gap-2 mt-3">
            <SkeletonBlock className="w-16 h-6" />
            <SkeletonBlock className="w-16 h-6" />
            <SkeletonBlock className="w-20 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stats row - 4 stat cards */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass p-4 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonCircle size={14} />
            <SkeletonLine className="w-20 h-2" />
          </div>
          <SkeletonLine className="w-16 h-7" />
        </div>
      ))}
    </div>
  );
}

/** Glass card with lines */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center gap-2">
        <SkeletonCircle size={14} />
        <SkeletonLine className="w-32 h-4" />
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** List of rows */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass p-5 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <SkeletonCircle size={14} />
        <SkeletonLine className="w-32 h-4" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl px-4 py-3"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <SkeletonCircle size={8} />
          <SkeletonLine className="w-20 h-3" />
          <SkeletonLine className="w-16 h-3" />
          <div className="flex-1" />
          <SkeletonLine className="w-12 h-3" />
        </div>
      ))}
    </div>
  );
}

/** Grid of cards */
export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="glass p-4 space-y-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-2">
            <SkeletonCircle size={28} />
            <div className="flex-1 space-y-1.5">
              <SkeletonLine className="w-24 h-3" />
              <SkeletonLine className="w-16 h-2" />
            </div>
          </div>
          <SkeletonBlock className="h-8 w-full" />
          <SkeletonLine className="w-full h-1.5" />
        </div>
      ))}
    </div>
  );
}

/** Progress ring skeleton */
export function SkeletonProgressRing() {
  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center gap-2">
        <SkeletonCircle size={14} />
        <SkeletonLine className="w-32 h-4" />
      </div>
      <div className="flex items-center justify-center py-4">
        <div className="skeleton rounded-full" style={{ width: 100, height: 100 }} />
      </div>
    </div>
  );
}

/** Full page skeleton for storyboard */
export function StoryboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonHeroCard />
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-3">
          <SkeletonCircle size={14} />
          <SkeletonLine className="w-28 h-4" />
        </div>
        <SkeletonBlock className="h-8 w-full" />
      </div>
      <SkeletonGrid count={3} cols={3} />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="glass p-5 space-y-3">
          <div className="flex items-center gap-4">
            <SkeletonCircle size={40} />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="w-32 h-4" />
              <div className="flex gap-4">
                <SkeletonLine className="w-20 h-2" />
                <SkeletonLine className="w-16 h-2" />
                <SkeletonLine className="w-24 h-2" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full page skeleton for voices */
export function VoicesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <SkeletonCircle size={20} />
        <SkeletonLine className="w-24 h-5" />
      </div>
      <div className="glass glow-cyan p-5 space-y-3">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={40} />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-48 h-4" />
            <SkeletonLine className="w-64 h-3" />
          </div>
          <SkeletonLine className="w-16 h-8" />
        </div>
        <SkeletonBlock className="h-2 w-full" />
      </div>
      <SkeletonGrid count={6} cols={3} />
      <SkeletonList rows={8} />
    </div>
  );
}

/** Full page skeleton for clips */
export function ClipsSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <SkeletonStatRow count={4} />
      <SkeletonBlock className="h-3 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonBlock key={i} className="h-9 w-28" />
        ))}
        <div className="flex-1" />
        <SkeletonBlock className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="glass p-4 space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
            <SkeletonBlock className="h-28 w-full" />
            <div className="flex items-center gap-2">
              <SkeletonCircle size={8} />
              <SkeletonLine className="w-20 h-3" />
            </div>
            <SkeletonLine className="w-16 h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full page skeleton for logs */
export function LogsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <SkeletonCircle size={20} />
        <SkeletonLine className="w-16 h-5" />
      </div>
      <SkeletonStatRow count={3} />
      <SkeletonList rows={6} />
      <SkeletonCard lines={4} />
    </div>
  );
}
