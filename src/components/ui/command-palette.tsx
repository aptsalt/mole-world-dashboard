"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Film,
  BookOpen,
  Mic,
  FileText,
  Layers,
  Cog,
  Rocket,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useToastStore } from "./toast";

const COMMANDS = [
  { label: "Dashboard", icon: LayoutDashboard, action: "navigate", path: "/" },
  { label: "Clips", icon: Film, action: "navigate", path: "/clips" },
  {
    label: "Storyboard",
    icon: BookOpen,
    action: "navigate",
    path: "/storyboard",
  },
  { label: "Voice Lab", icon: Mic, action: "navigate", path: "/voices" },
  { label: "Logs", icon: FileText, action: "navigate", path: "/logs" },
  { label: "Compose", icon: Layers, action: "navigate", path: "/compose" },
  { label: "Settings", icon: Cog, action: "navigate", path: "/settings" },
  { label: "Pitch Deck", icon: Rocket, action: "navigate", path: "/pitch" },
  { label: "Analytics", icon: BarChart3, action: "navigate", path: "/analytics" },
  { label: "Refresh Data", icon: RefreshCw, action: "refresh", path: "" },
] as const;

type Command = (typeof COMMANDS)[number];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { refreshAll } = useDashboardStore();
  const { addToast } = useToastStore();

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const runCommand = useCallback(
    async (cmd: Command) => {
      setOpen(false);
      if (cmd.action === "navigate") {
        router.push(cmd.path);
      } else if (cmd.action === "refresh") {
        await refreshAll();
        addToast("success", "Data refreshed");
      }
    },
    [router, refreshAll, addToast]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      runCommand(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => setOpen(false)}
      style={{ zIndex: 300 }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.10]">
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
          />
          <span className="kbd">ESC</span>
        </div>
        <div id="command-list" role="listbox" className="p-2 max-h-[320px] overflow-y-auto">
          {filtered.map((cmd, i) => (
            <button
              key={cmd.label}
              onClick={() => runCommand(cmd)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-cyan/10 text-cyan"
                  : "text-muted hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <cmd.icon size={16} />
              <span>{cmd.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted py-8">
              No commands found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
