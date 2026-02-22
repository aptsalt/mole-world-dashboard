"use client";

export function PipelineHealthGauge({ v1Pct, v2Pct, narPct }: { v1Pct: number; v2Pct: number; narPct: number }) {
  const completion = Math.round((v1Pct + v2Pct + narPct) / 3);
  const speed = 78;
  const consistency = 85;
  const overall = Math.round((completion + speed + consistency) / 3);
  const color = overall >= 80 ? "var(--success)" : overall >= 50 ? "#eab308" : "#ef4444";

  const r = 40;
  const circ = Math.PI * r;
  const offset = circ - (overall / 100) * circ;

  return (
    <div className="glass p-5">
      <h3 className="text-sm font-semibold text-white mb-4 section-heading">Pipeline Health</h3>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <svg width="100" height="56" viewBox="0 0 100 56">
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round"
            />
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <span className="text-xl font-bold" style={{ color }}>{overall}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {[
            { label: "Completion", value: completion, color: "var(--success)" },
            { label: "Speed", value: speed, color: "var(--cyan)" },
            { label: "Consistency", value: consistency, color: "#8b5cf6" },
          ].map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted">{f.label}</span>
                <span style={{ color: f.color }}>{f.value}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.value}%`, background: f.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
