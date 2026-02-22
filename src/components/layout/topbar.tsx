"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  RefreshCw,
  Eye,
  Monitor,
  Clock,
  Wifi,
  WifiOff,
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useDashboardStore } from "@/lib/store";
import { useToastStore } from "@/components/ui/toast";
import { openShortcuts } from "@/components/ui/keyboard-shortcuts";
import { Tooltip } from "@/components/ui/tooltip";
import { useSSEStatus } from "@/lib/use-sse";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/clips": "Clips",
  "/storyboard": "Storyboard",
  "/voices": "Voice Lab",
  "/production": "Production",
  "/queue": "Queue Editor",
  "/logs": "Logs",
  "/compose": "Compose",
  "/settings": "Settings",
  "/pitch": "Pitch Deck",
  "/videos": "Videos",
  "/gallery": "Gallery",
  "/whatsapp": "WhatsApp",
  "/orchestrate": "Orchestrate",
  "/narration": "Narration Studio",
  "/distribution": "Distribution Hub",
  "/research": "Research Hub",
  "/distribution/x": "X / Twitter Distribution",
  "/distribution/instagram": "Instagram Distribution",
  "/distribution/youtube": "YouTube Distribution",
  "/distribution/tiktok": "TikTok Distribution",
  "/research/x": "X / Twitter Research",
  "/research/instagram": "Instagram Research",
  "/research/youtube": "YouTube Research",
  "/research/tiktok": "TikTok Research",
  "/research/news": "RSS News Feed",
  "/analytics": "Content Analytics",
};

const PAGE_KEYS: Record<string, string> = {
  "1": "/",
  "2": "/clips",
  "3": "/storyboard",
  "4": "/voices",
  "5": "/logs",
  "6": "/compose",
  "7": "/settings",
};

interface Notification {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  time: string;
}

function relativeTimeNotif(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const NOTIF_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

function useAutoRefresh(onRefresh: () => Promise<void>) {
  const [countdown, setCountdown] = useState(30);
  const [enabled, setEnabled] = useState(true);
  const [interval, setIntervalSec] = useState(30);
  const countdownRef = useRef(30);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mw-preferences");
      if (raw) {
        const prefs = JSON.parse(raw);
        if (typeof prefs.autoRefresh === "boolean") setEnabled(prefs.autoRefresh);
        if (typeof prefs.autoRefreshInterval === "number") {
          setIntervalSec(prefs.autoRefreshInterval);
          setCountdown(prefs.autoRefreshInterval);
          countdownRef.current = prefs.autoRefreshInterval;
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;
    countdownRef.current = interval;
    setCountdown(interval);

    const timer = globalThis.setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        countdownRef.current = interval;
        onRefresh();
      }
      setCountdown(countdownRef.current);
    }, 1000);

    return () => globalThis.clearInterval(timer);
  }, [enabled, interval, onRefresh]);

  const reset = useCallback(() => {
    countdownRef.current = interval;
    setCountdown(interval);
  }, [interval]);

  return { countdown, enabled, interval, reset };
}

function buildBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: "MW", href: "/" }];

  // Handle nested routes
  if (pathname.startsWith("/distribution/")) {
    crumbs.push({ label: "Distribution", href: "/distribution" });
    const sub = PAGE_TITLES[pathname];
    if (sub) crumbs.push({ label: sub });
  } else if (pathname.startsWith("/research/")) {
    crumbs.push({ label: "Research", href: "/research" });
    const sub = PAGE_TITLES[pathname];
    if (sub) crumbs.push({ label: sub });
  } else {
    const title = PAGE_TITLES[pathname] ?? "Page";
    crumbs.push({ label: title });
  }

  return crumbs;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshAll, automationEvents, automationStatus } = useDashboardStore();
  const { addToast } = useToastStore();
  const sseStatus = useSSEStatus((s) => s.status);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    addToast("success", "Data refreshed");
  }, [refreshAll, addToast]);

  const autoRefresh = useAutoRefresh(handleRefresh);

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Keyboard shortcuts for page navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const path = PAGE_KEYS[e.key];
      if (path) {
        e.preventDefault();
        router.push(path);
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleRefresh();
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setNotifOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, handleRefresh]);

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];

    // Add automation events as notifications
    if (automationEvents && automationEvents.length > 0) {
      for (const event of automationEvents.slice(0, 10)) {
        const type: "info" | "success" | "warning" =
          event.type === "error" ? "warning" :
          event.type === "completed" || event.type === "image_complete" || event.type === "video_complete" ? "success" :
          "info";
        notifs.push({
          id: event.id ?? `${event.timestamp}-${event.type}`,
          type,
          title: event.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? "Event",
          message: event.message ?? event.shotId ?? "",
          time: event.timestamp ? relativeTimeNotif(event.timestamp) : "",
        });
      }
    }

    // Add service status notification
    if (automationStatus) {
      if (automationStatus.state === "running") {
        notifs.unshift({
          id: "service-running",
          type: "success",
          title: "Service Running",
          message: automationStatus.currentShot ? `Processing ${automationStatus.currentShot}` : "Automation active",
          time: "now",
        });
      } else if (automationStatus.state === "error") {
        notifs.unshift({
          id: "service-error",
          type: "warning",
          title: "Service Error",
          message: "Automation service encountered an error",
          time: "now",
        });
      }
    }

    // Fallback if no real data
    if (notifs.length === 0) {
      notifs.push({
        id: "no-events",
        type: "info",
        title: "No Events",
        message: "Start the automation service to see live notifications",
        time: "",
      });
    }

    return notifs;
  }, [automationEvents, automationStatus]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-sidebar-bg/85 px-4 backdrop-blur-md">
        {/* Left: Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          {buildBreadcrumbs(pathname).map((crumb, i, arr) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-white/50">/</span>}
              {crumb.href && i < arr.length - 1 ? (
                <Link
                  href={crumb.href}
                  className={clsx(
                    "transition-colors",
                    i === 0 ? "font-semibold text-cyan hover:text-cyan/80" : "text-muted hover:text-white"
                  )}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={i === arr.length - 1 ? "text-white font-medium" : "text-muted"}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* Clock */}
          <div className="mr-2 flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-mono text-muted">
            <Clock size={12} />
            <span>{time}</span>
          </div>

          {/* GPU indicator */}
          <div className="mr-2 flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs">
            <Monitor size={12} className="text-success" />
            <span className="font-mono text-muted">GPU 42%</span>
          </div>

          {/* ComfyUI link */}
          <a
            href="http://127.0.0.1:8188"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            ComfyUI
          </a>

          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-white/[0.08]" />

          {/* Search - opens command palette */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
            aria-label="Search"
          >
            <Search size={14} />
            <kbd className="hidden rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-muted sm:inline-block">
              Ctrl+K
            </kbd>

          </button>

          {/* Keyboard shortcuts */}
          <button
            onClick={() => openShortcuts()}
            className="rounded-lg px-1.5 py-1 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
            aria-label="Keyboard shortcuts"
          >
            <kbd className="kbd text-[10px]">?</kbd>
          </button>

          {/* Preview */}
          <Tooltip content="Compose Preview">
            <button
              onClick={() => router.push("/compose")}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Preview"
            >
              <Eye size={14} />
            </button>
          </Tooltip>

          {/* Notifications */}
          <Tooltip content="Notifications (N)">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Notifications"
            >
              <Bell size={14} />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan" aria-label="Unread notifications" />
              )}
            </button>
          </Tooltip>

          {/* Refresh with countdown */}
          <Tooltip content={`Refresh (R)${autoRefresh.enabled ? ` · ${autoRefresh.countdown}s` : ""}`}>
            <div className="relative">
              <button
                onClick={() => {
                  autoRefresh.reset();
                  handleRefresh();
                }}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
                aria-label="Refresh"
                disabled={refreshing}
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            {autoRefresh.enabled && !refreshing && (
              <div className="absolute -bottom-0.5 -right-0.5 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <circle
                    cx="7" cy="7" r="5"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="7" cy="7" r="5"
                    fill="none"
                    stroke="var(--cyan)"
                    strokeWidth="1.5"
                    strokeDasharray={2 * Math.PI * 5}
                    strokeDashoffset={2 * Math.PI * 5 * (1 - autoRefresh.countdown / autoRefresh.interval)}
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.3s linear" }}
                  />
                </svg>
              </div>
            )}
            </div>
          </Tooltip>

          {/* SSE Live indicator */}
          {sseStatus === "connected" && (
            <Tooltip content="Real-time updates active">
              <div
                className="ml-1 flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-1 text-[11px]"
                aria-label="SSE: Live"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <span className="text-success font-medium">Live</span>
              </div>
            </Tooltip>
          )}

          {/* Connection status */}
          <div
            className="ml-1 flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px]"
            aria-label={isOnline ? "Connection: Online" : "Connection: Demo mode offline"}
          >
            {isOnline ? (
              <>
                <Wifi size={12} className="text-success" />
                <span className="text-success font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-warning" />
                <span className="text-warning font-medium">Demo Mode</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      {notifOpen && (
        <div className="drawer-overlay" onClick={() => setNotifOpen(false)} />
      )}
      <div className={`notif-panel ${notifOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan" />
            <h3 className="text-sm font-semibold text-text">Notifications</h3>
            <span className="badge badge-v1">{notifications.length}</span>
          </div>
          <button
            onClick={() => setNotifOpen(false)}
            className="text-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.map((notif) => {
            const Icon = NOTIF_ICONS[notif.type];
            return (
              <div
                key={notif.id}
                className={`rounded-xl p-3 border transition-colors cursor-pointer hover:bg-white/[0.04] ${
                  notif.type === "success" ? "bg-success/[0.04] border-success/10" :
                  notif.type === "warning" ? "bg-warning/[0.04] border-warning/10" :
                  "bg-cyan/[0.04] border-cyan/10"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon size={14} className={
                    notif.type === "success" ? "text-success mt-0.5" :
                    notif.type === "warning" ? "text-warning mt-0.5" :
                    "text-cyan mt-0.5"
                  } />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-text">{notif.title}</p>
                      <span className="text-[10px] text-muted shrink-0">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{notif.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-white/[0.08]">
          <button className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] py-2 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-all">
            Mark all as read
          </button>
        </div>
      </div>
    </>
  );
}
