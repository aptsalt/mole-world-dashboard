"use client";

import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["1"], description: "Go to Dashboard" },
      { keys: ["2"], description: "Go to Clips" },
      { keys: ["3"], description: "Go to Storyboard" },
      { keys: ["4"], description: "Go to Voice Lab" },
      { keys: ["5"], description: "Go to Logs" },
      { keys: ["6"], description: "Go to Compose" },
      { keys: ["7"], description: "Go to Settings" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["R"], description: "Refresh data" },
      { keys: ["N"], description: "Toggle notifications" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Clips Page",
    shortcuts: [
      { keys: ["Esc"], description: "Close drawer / modal" },
      { keys: ["←", "→"], description: "Navigate between clips in drawer" },
    ],
  },
];

const listeners = new Set<() => void>();
let shortcutsOpen = false;

export function openShortcuts() {
  shortcutsOpen = true;
  listeners.forEach((fn) => fn());
}

export function closeShortcuts() {
  shortcutsOpen = false;
  listeners.forEach((fn) => fn());
}

function useShortcutsState() {
  const [open, setOpen] = useState(shortcutsOpen);

  useEffect(() => {
    const listener = () => setOpen(shortcutsOpen);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return { open, close: closeShortcuts };
}

export function KeyboardShortcuts() {
  const { open, close } = useShortcutsState();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        if (shortcutsOpen) {
          closeShortcuts();
        } else {
          openShortcuts();
        }
      }

      if (e.key === "Escape" && shortcutsOpen) {
        e.preventDefault();
        closeShortcuts();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        className="modal-content max-w-lg w-[95%] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10">
              <Keyboard size={16} className="text-cyan" />
            </div>
            <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-xs text-white/80">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="kbd min-w-[24px] text-center inline-block">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-white/20 mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 p-3 border-t border-white/[0.06] text-[10px] text-muted">
          <span>Press</span>
          <kbd className="kbd">?</kbd>
          <span>to toggle this dialog</span>
        </div>
      </div>
    </div>
  );
}
