"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  {
    group: "Navigation",
    items: [
      { keys: ["Ctrl", "K"], desc: "Command palette" },
      { keys: ["1"], desc: "Dashboard" },
      { keys: ["2"], desc: "Clips" },
      { keys: ["3"], desc: "Storyboard" },
      { keys: ["4"], desc: "Voice Lab" },
      { keys: ["5"], desc: "Logs" },
      { keys: ["6"], desc: "Compose" },
      { keys: ["7"], desc: "Settings" },
    ],
  },
  {
    group: "Actions",
    items: [
      { keys: ["R"], desc: "Refresh data" },
      { keys: ["N"], desc: "Toggle notifications" },
      { keys: ["?"], desc: "Show shortcuts" },
      { keys: ["Esc"], desc: "Close modal / drawer" },
    ],
  },
  {
    group: "Clips Page",
    items: [
      { keys: ["\u2190", "\u2192"], desc: "Navigate shots (drawer/cinema)" },
      { keys: ["Esc"], desc: "Close drawer or cinema mode" },
    ],
  },
];

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    const custom = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("open-shortcuts", custom);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("open-shortcuts", custom);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => setOpen(false)}
      style={{ zIndex: 310 }}
    >
      <div
        className="modal-content p-6"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                {group.group}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.desc}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <span key={k} className="kbd">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
