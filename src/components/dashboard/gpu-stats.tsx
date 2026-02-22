"use client";

import { Gauge } from "lucide-react";

function value68Color(temp: number): string {
  if (temp < 60) return "var(--success)";
  if (temp < 80) return "var(--warning)";
  return "#ef4444";
}

export function GpuStatsWidget() {
  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={14} className="text-cyan" />
        <h3 className="text-sm font-semibold text-white section-heading">GPU Stats</h3>
        <span className="ml-auto text-[10px] text-success font-semibold uppercase">Online</span>
      </div>
      <div className="space-y-3">
        {[
          { label: "VRAM Usage", value: 78, max: "16 GB", color: "var(--cyan)" },
          { label: "GPU Utilization", value: 92, max: "100%", color: "var(--success)" },
          { label: "Temperature", value: 68, max: "90\u00b0C", color: value68Color(68) },
          { label: "Power Draw", value: 85, max: "450W", color: "var(--warning)" },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted">{stat.label}</span>
              <span className="font-mono" style={{ color: stat.color }}>{stat.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${stat.value}%`, background: stat.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted border-t border-white/[0.04] pt-3">
        <span>RTX 4090</span>
        <span className="text-white/20">|</span>
        <span>CUDA 12.x</span>
        <span className="text-white/20">|</span>
        <span>16 GB VRAM</span>
      </div>
    </div>
  );
}
