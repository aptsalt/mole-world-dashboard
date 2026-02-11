"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  RefreshCw,
  Eye,
  Monitor,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/clips": "Clips",
  "/storyboard": "Storyboard",
  "/voices": "Voice Lab",
  "/logs": "Logs",
  "/compose": "Compose",
  "/settings": "Settings",
  "/pitch": "Pitch Deck",
};

export function Topbar() {
  const pathname = usePathname();
  const [time, setTime] = useState("");
  const [isOnline, setIsOnline] = useState(true);

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

  const pageTitle = PAGE_TITLES[pathname] ?? "Page";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0c0c18]/80 px-4 backdrop-blur-md">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-cyan">MW</span>
        <span className="text-white/20">/</span>
        <span className="text-muted">Chapter 1</span>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">{pageTitle}</span>
      </div>

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

        {/* Search */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          aria-label="Search"
        >
          <Search size={14} />
          <kbd className="hidden rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-white/30 sm:inline-block">
            Ctrl+K
          </kbd>
        </button>

        {/* Preview */}
        <button
          className="rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          aria-label="Preview"
        >
          <Eye size={14} />
        </button>

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={14} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan" />
        </button>

        {/* Refresh */}
        <button
          className="rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-white"
          aria-label="Refresh"
        >
          <RefreshCw size={14} />
        </button>

        {/* Connection status */}
        <div className="ml-1 flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px]">
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
  );
}
