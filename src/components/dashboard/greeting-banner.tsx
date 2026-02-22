"use client";

import { Sun, Moon, Sunset } from "lucide-react";

// ── Helpers ──────────────────────────────────────────

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", icon: Sun };
  if (h < 17) return { text: "Good afternoon", icon: Sunset };
  return { text: "Good evening", icon: Moon };
}

// ── Component ────────────────────────────────────────

export function GreetingBanner({ v1Done, v2Done, narDone, v1Total, v2Total, narTotal }: {
  v1Done: number; v2Done: number; narDone: number;
  v1Total: number; v2Total: number; narTotal: number;
}) {
  const { text, icon: Icon } = getGreeting();
  const totalDone = v1Done + v2Done + narDone;
  const totalAll = v1Total + v2Total + narTotal;
  const healthPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <div className="glass glow-cyan border-shimmer p-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
            <Icon size={20} className="text-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{text}</h1>
            <p className="text-xs text-muted">The Mole World — Chapter 1 Production</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="text-center">
            <p className="text-lg font-bold text-success number-pop">{totalDone}</p>
            <p className="text-muted">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber number-pop">{totalAll - totalDone}</p>
            <p className="text-muted">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan number-pop">{healthPct}%</p>
            <p className="text-muted">Health</p>
          </div>
        </div>
      </div>
    </div>
  );
}
