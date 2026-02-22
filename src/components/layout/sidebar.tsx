"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Sparkles,
  Zap,
  Video,
  ListOrdered,
  MessageSquare,
  Newspaper,
  Clapperboard,
  Monitor,
  Activity,
  Layers,
  Send,
  Image as ImageIcon,
  AtSign,
  Camera,
  Youtube,
  Music,
  LayoutGrid,
  AudioLines,
  BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import { useDashboardStore } from "@/lib/store";

// ── Types ──────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  badge?: string;
  children?: NavItem[];
  defaultExpanded?: boolean;
}

// ── Navigation structure ───────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { id: "orchestrate", label: "Orchestrate", icon: Clapperboard, href: "/orchestrate", badge: "CMD" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics", badge: "NEW" },
  {
    id: "local-production",
    label: "Local Production",
    icon: Monitor,
    defaultExpanded: true,
    children: [
      { id: "clips", label: "Clips", icon: Film, href: "/clips" },
      { id: "compose", label: "Compose", icon: Layers, href: "/compose" },
      { id: "videos", label: "Videos", icon: Video, href: "/videos", badge: "LIVE" },
      { id: "storyboard", label: "Storyboard", icon: BookOpen, href: "/storyboard" },
      { id: "voice-lab", label: "Voice Lab", icon: Mic, href: "/voices" },
      { id: "narration-studio", label: "Narration", icon: AudioLines, href: "/narration" },
    ],
  },
  {
    id: "higgsfield",
    label: "Higgsfield",
    icon: Zap,
    children: [
      { id: "gallery", label: "Gallery", icon: ImageIcon, href: "/gallery", badge: "NEW" },
      { id: "automation", label: "Automation", icon: Activity, href: "/production", badge: "AUTO" },
      { id: "shot-queue", label: "Shot Queue", icon: ListOrdered, href: "/queue" },
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, href: "/whatsapp", badge: "WA" },
    ],
  },
  {
    id: "research",
    label: "Research Hub",
    icon: Newspaper,
    children: [
      { id: "research-dash", label: "Dashboard", icon: LayoutGrid, href: "/research", badge: "HUB" },
      { id: "research-x", label: "X", icon: AtSign, href: "/research/x" },
      { id: "research-instagram", label: "Instagram", icon: Camera, href: "/research/instagram" },
      { id: "research-youtube", label: "YouTube", icon: Youtube, href: "/research/youtube" },
      { id: "research-tiktok", label: "TikTok", icon: Music, href: "/research/tiktok" },
      { id: "research-news", label: "News Feed", icon: Newspaper, href: "/research/news", badge: "RSS" },
    ],
  },
  {
    id: "distribution",
    label: "Distribution",
    icon: Send,
    children: [
      { id: "dist-hub", label: "Hub", icon: LayoutGrid, href: "/distribution", badge: "HUB" },
      { id: "dist-x", label: "X", icon: AtSign, href: "/distribution/x" },
      { id: "dist-instagram", label: "Instagram", icon: Camera, href: "/distribution/instagram" },
      { id: "dist-youtube", label: "YouTube", icon: Youtube, href: "/distribution/youtube" },
      { id: "dist-tiktok", label: "TikTok", icon: Music, href: "/distribution/tiktok" },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Cog,
    children: [
      { id: "logs", label: "Logs", icon: Terminal, href: "/logs" },
      { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
      { id: "pitch", label: "Pitch Deck", icon: Presentation, href: "/pitch" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────

/** Build the set of expanded group IDs from persisted preferences, falling back to defaultExpanded. */
function resolveExpandedGroups(persisted: Record<string, boolean>): Set<string> {
  const expanded = new Set<string>();
  for (const item of NAV_ITEMS) {
    if (!item.children) continue;
    const stored = persisted[item.id];
    if (stored === true) expanded.add(item.id);
    else if (stored === undefined && item.defaultExpanded) expanded.add(item.id);
    // stored === false → leave collapsed
  }
  return expanded;
}

/** Find the group ID that contains a given path */
function findParentGroup(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if (!item.children) continue;
    for (const child of item.children) {
      if (child.href && child.href !== "#") {
        if (child.href === "/" ? pathname === "/" : pathname.startsWith(child.href)) {
          return item.id;
        }
      }
    }
  }
  return null;
}

// ── Component ──────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const { status, clips, preferences, setSidebarExpanded } = useDashboardStore();

  // Derive expanded groups from persisted preferences
  const expandedGroups = resolveExpandedGroups(preferences.sidebarExpanded);

  // Progress stats
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

  // Auto-expand group containing active child
  useEffect(() => {
    const parentId = findParentGroup(pathname);
    if (parentId && !expandedGroups.has(parentId)) {
      setSidebarExpanded(parentId, true);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close flyout on outside click
  useEffect(() => {
    if (!flyoutGroup) return;
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyoutGroup(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [flyoutGroup]);

  const isActive = (href?: string) => {
    if (!href || href === "#") return false;
    if (href === "/" || href === "/distribution") return pathname === href;
    return pathname.startsWith(href);
  };

  const isGroupActive = (item: NavItem) => {
    return item.children?.some((c) => isActive(c.href)) ?? false;
  };

  const toggleGroup = (id: string) => {
    setSidebarExpanded(id, !expandedGroups.has(id));
  };

  // ── NavLeaf ────────────────────────────────────────────────

  const NavLeaf = ({ item, isChild = false }: { item: NavItem; isChild?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <li>
        <Link
          href={item.href ?? "#"}
          className={clsx(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            isChild && !collapsed && "ml-3 border-l border-white/[0.08] pl-5",
            active
              ? "bg-cyan/[0.08] text-cyan"
              : "text-muted hover:bg-white/[0.04] hover:text-white"
          )}
          title={collapsed ? item.label : undefined}
        >
          {/* Active indicator bar */}
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
                <span className={clsx(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  item.badge === "SOON"
                    ? "bg-zinc-500/15 text-muted"
                    : "bg-cyan/15 text-cyan"
                )}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      </li>
    );
  };

  // ── NavGroup ───────────────────────────────────────────────

  const NavGroup = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const expanded = expandedGroups.has(item.id);
    const groupActive = isGroupActive(item);
    const showFlyout = collapsed && flyoutGroup === item.id;

    return (
      <li className="relative">
        {/* Group parent row */}
        <button
          onClick={() => {
            if (collapsed) {
              setFlyoutGroup((prev) => (prev === item.id ? null : item.id));
            } else {
              toggleGroup(item.id);
            }
          }}
          className={clsx(
            "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            groupActive
              ? "text-cyan/70"
              : "text-muted hover:bg-white/[0.04] hover:text-white"
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon
            size={18}
            className={clsx(
              "shrink-0 transition-transform duration-200",
              groupActive && "scale-110",
              !groupActive && "group-hover:scale-105"
            )}
          />
          {!collapsed && (
            <>
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider">
                {item.label}
              </span>
              <ChevronDown
                size={14}
                className={clsx(
                  "ml-auto shrink-0 text-muted transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </>
          )}
        </button>

        {/* Expanded children (sidebar expanded mode) */}
        {!collapsed && (
          <div
            className="nav-group-children"
            data-expanded={expanded ? "true" : "false"}
          >
            <ul className="flex flex-col gap-0.5 pb-1">
              {item.children?.map((child) => (
                <NavLeaf key={child.id} item={child} isChild />
              ))}
            </ul>
          </div>
        )}

        {/* Flyout popup (sidebar collapsed mode) */}
        {showFlyout && (
          <div
            ref={flyoutRef}
            className="absolute left-full top-0 z-50 ml-2 min-w-[180px] rounded-xl border border-white/[0.12] bg-bg-light p-2 shadow-xl"
            onMouseLeave={() => setFlyoutGroup(null)}
          >
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {item.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {item.children?.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isActive(child.href);
                return (
                  <li key={child.id}>
                    <Link
                      href={child.href ?? "#"}
                      onClick={() => setFlyoutGroup(null)}
                      className={clsx(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                        childActive
                          ? "bg-cyan/[0.08] text-cyan"
                          : "text-muted hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <ChildIcon size={14} />
                      <span>{child.label}</span>
                      {child.badge && (
                        <span className={clsx(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                          child.badge === "SOON"
                            ? "bg-zinc-500/15 text-muted"
                            : "bg-cyan/15 text-cyan"
                        )}>
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </li>
    );
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <aside
      className={clsx(
        "sidebar-transition relative flex flex-col border-r border-white/[0.08] bg-sidebar-bg",
        "h-screen shrink-0",
        collapsed ? "w-[68px]" : "w-[236px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-4">
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
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <NavGroup key={item.id} item={item} />
            ) : (
              <NavLeaf key={item.id} item={item} />
            )
          )}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.08] p-3">
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
