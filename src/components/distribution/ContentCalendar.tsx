"use client";

import { useState, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";
import type { ContentPost } from "./types";
import { PLATFORM_META } from "./types";

interface ContentCalendarProps {
  posts: ContentPost[];
  onPostClick?: (post: ContentPost) => void;
  onReschedule?: (postId: string, date: Date) => void;
  onCreateForDate?: (date: Date) => void;
}

type ViewMode = "week" | "month";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Date Helpers ─────────────────────────────────────────────
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  for (let i = 0; i < startDow; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
}

// ── Tooltip component ────────────────────────────────────────
function PostTooltip({ post, x, y }: { post: ContentPost; x: number; y: number }) {
  const platKeys = Object.keys(post.platforms).filter((k) => post.platforms[k]?.enabled);
  return (
    <div
      className="fixed z-[200] pointer-events-none animate-slide-up"
      style={{ left: x, top: y - 8, transform: "translate(-50%, -100%)" }}
    >
      <div className="bg-bg-light border border-white/[0.15] rounded-lg p-3 shadow-xl max-w-[220px]">
        <p className="text-[11px] font-medium text-white truncate">{post.storyTitle}</p>
        <p className="text-[9px] text-white/40 mt-0.5 line-clamp-2">{post.caption.slice(0, 80)}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {platKeys.map((k) => {
            const meta = PLATFORM_META[k];
            if (!meta) return null;
            return (
              <span
                key={k}
                className="px-1.5 py-0.5 rounded text-[8px] font-medium"
                style={{ background: `${meta.dotColor}15`, color: meta.dotColor }}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
        {post.scheduledAt && (
          <p className="text-[8px] text-white/30 mt-1">
            {new Date(post.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────
export default function ContentCalendar({ posts, onPostClick, onReschedule, onCreateForDate }: ContentCalendarProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragPost, setDragPost] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ post: ContentPost; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Scheduled posts only
  const scheduledPosts = useMemo(
    () => posts.filter((p) => p.scheduledAt),
    [posts]
  );

  // Total count of non-scheduled posts for empty state
  const unscheduledCount = posts.length - scheduledPosts.length;

  function postsForDay(date: Date): ContentPost[] {
    return scheduledPosts.filter((p) => {
      if (!p.scheduledAt) return false;
      return isSameDay(new Date(p.scheduledAt), date);
    });
  }

  function platformDotsForPost(post: ContentPost): string[] {
    return Object.keys(post.platforms).filter((k) => post.platforms[k]?.enabled);
  }

  // Navigation
  function navigate(dir: -1 | 1) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setMonth(d.getMonth() + dir);
      return d;
    });
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  // Reschedule hour picker state
  const [rescheduleTarget, setRescheduleTarget] = useState<{ postId: string; date: Date } | null>(null);
  const [rescheduleHour, setRescheduleHour] = useState(9);

  // Drag & drop
  function handleDragStart(postId: string, e: React.DragEvent) {
    setDragPost(postId);
    e.dataTransfer.effectAllowed = "move";
    // Make drag ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragPost(null);
    setDragOverDay(null);
  }

  function handleDragOver(dayKey: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayKey);
  }

  function handleDrop(date: Date) {
    if (dragPost && onReschedule) {
      setRescheduleTarget({ postId: dragPost, date });
      setRescheduleHour(9);
    }
    setDragPost(null);
    setDragOverDay(null);
  }

  function confirmReschedule() {
    if (rescheduleTarget && onReschedule) {
      const d = new Date(rescheduleTarget.date);
      d.setHours(rescheduleHour, 0, 0, 0);
      onReschedule(rescheduleTarget.postId, d);
    }
    setRescheduleTarget(null);
  }

  function cancelReschedule() {
    setRescheduleTarget(null);
  }

  // Tooltip
  function showTooltip(post: ContentPost, e: React.MouseEvent) {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      setTooltip({ post, x: e.clientX, y: e.clientY });
    }, 400);
  }

  function hideTooltip() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  }

  // ── Views ──────────────────────────────────────────────────
  const weekStart = startOfWeek(currentDate);
  const weekDays = getWeekDays(weekStart);
  const monthGrid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div className="glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-cyan" />
          <h3 className="text-sm font-semibold text-white">
            {view === "week"
              ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          </h3>
          {scheduledPosts.length > 0 && (
            <span className="text-[9px] text-white/30 ml-1">{scheduledPosts.length} scheduled</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="text-[10px] px-2 py-1 rounded-md text-cyan/60 hover:text-cyan hover:bg-cyan/10 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[10px] font-medium transition-all capitalize",
                  view === v ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/60"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center py-1.5 text-[9px] font-semibold text-white/30 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {view === "week" ? (
        <div className="grid grid-cols-7">
          {weekDays.map((day) => {
            const dayPosts = postsForDay(day);
            const today = isToday(day);
            const dayKey = day.toISOString();
            const isDropTarget = dragOverDay === dayKey;
            return (
              <div
                key={dayKey}
                className={clsx(
                  "min-h-[100px] p-1.5 border-r border-b border-white/[0.04] last:border-r-0 transition-all group/day",
                  today && "bg-cyan/[0.03]",
                  isDropTarget && dragPost && "bg-cyan/[0.08] ring-1 ring-inset ring-cyan/30",
                  dragPost && !isDropTarget && "hover:bg-white/[0.03]"
                )}
                onDragOver={(e) => handleDragOver(dayKey, e)}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={() => handleDrop(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={clsx(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium",
                    today ? "text-cyan bg-cyan/20 ring-1 ring-cyan/30" : "text-white/50"
                  )}>
                    {day.getDate()}
                  </span>
                  {onCreateForDate && (
                    <button
                      onClick={() => onCreateForDate(day)}
                      className="opacity-0 group-hover/day:opacity-100 p-0.5 rounded hover:bg-white/[0.08] text-white/20 hover:text-cyan transition-all"
                      aria-label={`Create post for ${day.toLocaleDateString()}`}
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map((post) => {
                    const platKeys = platformDotsForPost(post);
                    const dotColor = platKeys[0] ? PLATFORM_META[platKeys[0]]?.dotColor : "#888";
                    return (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStart(post.id, e)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onPostClick?.(post)}
                        onMouseEnter={(e) => showTooltip(post, e)}
                        onMouseLeave={hideTooltip}
                        className={clsx(
                          "px-1.5 py-1 rounded-md text-[8px] truncate cursor-pointer transition-all",
                          dragPost === post.id ? "opacity-40" : "hover:brightness-125"
                        )}
                        style={{ background: `${dotColor}20`, color: dotColor, borderLeft: `2px solid ${dotColor}` }}
                      >
                        {post.storyTitle.slice(0, 20)}
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <div className="text-[8px] text-white/30 text-center cursor-pointer hover:text-white/50 transition-colors">
                      +{dayPosts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {monthGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={`empty-${di}`} className="min-h-[60px] border-r border-b border-white/[0.04] last:border-r-0 opacity-30" />;
                }
                const dayPosts = postsForDay(day);
                const today = isToday(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const dayKey = day.toISOString();
                const isDropTarget = dragOverDay === dayKey;
                return (
                  <div
                    key={dayKey}
                    className={clsx(
                      "min-h-[60px] p-1 border-r border-b border-white/[0.04] last:border-r-0 transition-all group/day",
                      today && "bg-cyan/[0.03]",
                      !isCurrentMonth && "opacity-30",
                      isDropTarget && dragPost && "bg-cyan/[0.08] ring-1 ring-inset ring-cyan/30",
                      dragPost && !isDropTarget && "hover:bg-white/[0.03]"
                    )}
                    onDragOver={(e) => handleDragOver(dayKey, e)}
                    onDragLeave={() => setDragOverDay(null)}
                    onDrop={() => handleDrop(day)}
                  >
                    <div className={clsx(
                      "text-[10px] font-medium mb-0.5 text-center",
                      today ? "text-cyan" : "text-white/40"
                    )}>
                      <span className={clsx(
                        "inline-flex items-center justify-center w-5 h-5 rounded-full",
                        today && "ring-1 ring-cyan/30"
                      )}>
                        {day.getDate()}
                      </span>
                    </div>
                    {dayPosts.length > 0 && (
                      <div className="flex items-center justify-center gap-0.5 flex-wrap">
                        {dayPosts.slice(0, 4).map((post) => {
                          const platKeys = platformDotsForPost(post);
                          return platKeys.slice(0, 2).map((k) => (
                            <span
                              key={`${post.id}-${k}`}
                              className="w-1.5 h-1.5 rounded-full cursor-pointer hover:scale-150 transition-transform"
                              style={{ background: PLATFORM_META[k]?.dotColor }}
                              title={post.storyTitle}
                              onClick={() => onPostClick?.(post)}
                            />
                          ));
                        })}
                        {dayPosts.length > 4 && (
                          <span className="text-[7px] text-white/30">+{dayPosts.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Unscheduled indicator */}
      {unscheduledCount > 0 && (
        <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2">
          <span className="text-[9px] text-white/30">
            {unscheduledCount} unscheduled {unscheduledCount === 1 ? "post" : "posts"} not shown
          </span>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && <PostTooltip post={tooltip.post} x={tooltip.x} y={tooltip.y} />}

      {/* Reschedule Hour Picker */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40" onClick={cancelReschedule}>
          <div
            className="bg-bg-light border border-white/[0.15] rounded-xl p-4 shadow-2xl min-w-[220px] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-white mb-1">Reschedule to</p>
            <p className="text-[10px] text-white/40 mb-3">
              {rescheduleTarget.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <label className="text-[10px] text-white/50 block mb-1">Hour</label>
            <select
              value={rescheduleHour}
              onChange={(e) => setRescheduleHour(Number(e.target.value))}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan/30 mb-3"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h} className="bg-[#1a1a2e] text-white">
                  {h.toString().padStart(2, "0")}:00{h < 12 ? " AM" : " PM"}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelReschedule}
                className="flex-1 px-3 py-1.5 rounded-lg text-[10px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReschedule}
                className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-cyan/20 text-cyan hover:bg-cyan/30 border border-cyan/20 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
