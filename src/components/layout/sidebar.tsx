"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  BookOpen,
  Mic,
  Terminal,
  Settings,
  Cog,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Video,
  ListOrdered,
  MessageSquare,
  Newspaper,
} from "lucide-react";
import { clsx } from "clsx";
import { useDashboardStore } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clips", label: "Clips", icon: Film },
  { href: "/storyboard", label: "Storyboard", icon: BookOpen },
  { href: "/voices", label: "Voice Lab", icon: Mic },
  { href: "/videos", label: "Videos", icon: Video, badge: "LIVE" },
  { href: "/production", label: "Production", icon: Zap, badge: "AUTO" },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare, badge: "WA" },
  { href: "/content", label: "Content", icon: Newspaper, badge: "NEW" },
  { href: "/queue", label: "Queue", icon: ListOrdered },
  { href: "/logs", label: "Logs", icon: Terminal },
  { href: "/compose", label: "Compose", icon: Settings },
  { href: "/settings", label: "Settings", icon: Cog },
  { href: "/pitch", label: "Pitch Deck", icon: Presentation },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { status, clips } = useDashboardStore();

  const v1Done = status?.v1?.done ?? 0;
  const v2Done = status?.v2?.done ?? 0;
  const narDone = status?.audio_narrations ?? 0;
  const totalShots = status?.total_shots ?? 89;
  const totalDone = v1Done + v2Done + narDone;
  const totalAll = totalShots * 3;
  const progressPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  const scenesComplete = clips.length > 0
    ? new Set(clips.filter((c) => c.has_clip).map((c) => c.scene_id)).size
    : 0;
  const totalScenes = clips.length > 0
    ? new Set(clips.map((c) => c.scene_id)).size
    : 14;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={clsx(
        "sidebar-transition relative flex flex-col border-r border-white/[0.06] bg-[#0c0c18]",
        "h-screen shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan font-bold text-sm">
          MW
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold tracking-wide text-white">
              THE MOLE WORLD
            </span>
            <span className="text-[10px] font-medium tracking-widest text-muted uppercase">
              Production Suite
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-cyan/[0.08] text-cyan"
                      : "text-muted hover:bg-white/[0.04] hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active indicator bar - animated */}
                  <span
                    className={clsx(
                      "absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan transition-all duration-300",
                      active ? "h-5 opacity-100 indicator-pulse" : "h-0 opacity-0"
                    )}
                  />
                  <Icon
                    size={18}
                    className={clsx(
                      "shrink-0 transition-transform duration-200",
                      active && "scale-110",
                      !active && "group-hover:scale-105"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-cyan">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-3">
        {!collapsed && (
          <div className="mb-3 rounded-lg bg-white/[0.03] p-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-cyan" />
              <span className="text-xs font-medium text-muted">
                Chapter 1 &mdash; The Beginning
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-cyan/60 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="mt-1 block text-[10px] text-muted">
              {scenesComplete} / {totalScenes} scenes with clips
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
