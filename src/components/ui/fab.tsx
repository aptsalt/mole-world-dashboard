"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Film, BookOpen, Mic, Terminal,
  Layers, Search, RefreshCw, Keyboard,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useToastStore } from "./toast";
import { openShortcuts } from "./keyboard-shortcuts";

interface FabAction {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  action: () => void;
}

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { refreshAll } = useDashboardStore();
  const { addToast } = useToastStore();

  const actions: FabAction[] = [
    {
      label: "Search",
      icon: Search,
      action: () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
      },
    },
    {
      label: "Refresh Data",
      icon: RefreshCw,
      action: async () => {
        await refreshAll();
        addToast("success", "Data refreshed");
      },
    },
    { label: "Clips", icon: Film, action: () => router.push("/clips") },
    { label: "Storyboard", icon: BookOpen, action: () => router.push("/storyboard") },
    { label: "Voice Lab", icon: Mic, action: () => router.push("/voices") },
    { label: "Compose", icon: Layers, action: () => router.push("/compose") },
    { label: "Logs", icon: Terminal, action: () => router.push("/logs") },
    { label: "Shortcuts", icon: Keyboard, action: () => openShortcuts() },
  ];

  const handleAction = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="fab-menu">
      {/* Menu items */}
      {open && (
        <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
          <div className="fab-items">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="fab-item">
                  <span className="fab-item-label">{item.label}</span>
                  <button
                    className="fab-item-btn"
                    onClick={() => handleAction(item.action)}
                    aria-label={item.label}
                  >
                    <Icon size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Main FAB trigger */}
      <button
        className={`fab-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Quick actions"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
