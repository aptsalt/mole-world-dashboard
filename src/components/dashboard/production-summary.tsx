"use client";

import { Zap, Clock, TrendingUp, HardDrive } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export function ProductionSummary({ totalRenders, totalHours, avgSeconds, diskMb }: {
  totalRenders: number; totalHours: number; avgSeconds: number; diskMb: number;
}) {
  const items = [
    { label: "Total Renders", value: `${totalRenders}`, icon: <Zap size={18} className="text-cyan" />, color: "var(--cyan)" },
    { label: "Render Time", value: `${totalHours.toFixed(1)}h`, icon: <Clock size={18} className="text-amber" />, color: "#ff6b35" },
    { label: "Avg Per Clip", value: formatDuration(avgSeconds), icon: <TrendingUp size={18} className="text-success" />, color: "var(--success)" },
    { label: "Disk Usage", value: `${diskMb.toFixed(1)} MB`, icon: <HardDrive size={18} className="text-violet-400" />, color: "#8b5cf6" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="glass stat-card p-4 group">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
              {item.icon}
            </div>
            <div>
              <p className="text-xs text-muted">{item.label}</p>
              <p className="text-lg font-bold text-white number-pop">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
