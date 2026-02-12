"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, ArrowUp } from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Screensaver } from "@/components/ui/screensaver";
import { MiniPlayer, MiniPlayerProvider } from "@/components/ui/mini-player";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleScroll = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    setShowScrollTop(el.scrollTop > 400);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <MiniPlayerProvider>
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, toggleable */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile hamburger + Topbar */}
        <div className="flex items-center">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-4 text-muted hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <Topbar />
          </div>
        </div>

        {/* Page content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile close button - visible when sidebar open */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed right-4 top-4 z-50 rounded-lg bg-white/10 p-2 text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      )}

      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className={clsx(
          "fixed bottom-20 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full",
          "bg-white/[0.08] border border-white/[0.12] text-muted backdrop-blur-md",
          "hover:bg-cyan/10 hover:border-cyan/30 hover:text-cyan",
          "transition-all duration-300",
          showScrollTop
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-4 opacity-0 pointer-events-none"
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp size={16} />
      </button>

      {/* Mini Player */}
      <MiniPlayer />
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
      {/* Screensaver */}
      <Screensaver />
    </div>
    </MiniPlayerProvider>
  );
}
