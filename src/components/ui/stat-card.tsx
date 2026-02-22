import React from "react";
import { clsx } from "clsx";

// ── Types ────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  /** CSS color value (e.g. "#22c55e", "var(--cyan)") or Tailwind text class (e.g. "text-cyan") */
  color: string;
  loading?: boolean;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────

/** Detect whether `color` is a Tailwind class (starts with "text-") vs a raw CSS value */
function isTailwindClass(color: string): boolean {
  return color.startsWith("text-");
}

/** Build a subtle background from a CSS color value — appends "15" (hex ~8% opacity) */
function iconBg(color: string): string {
  if (isTailwindClass(color)) return "";
  // Handle var() references — wrap in color-mix for opacity
  if (color.startsWith("var(")) {
    return `color-mix(in srgb, ${color} 8%, transparent)`;
  }
  // Hex / named / rgb — just append low alpha hex
  return `${color}15`;
}

// ── Component ────────────────────────────────────────────────

/**
 * Compact stat card used across dashboards.
 *
 * Covers all variants:
 *   - Research:     icon-left layout, `text-*` Tailwind color
 *   - Distribution: icon-box layout, raw CSS color
 *   - Voices:       icon-box layout, CSS variable color
 *   - Production:   icon-left layout, `text-*` Tailwind color
 *   - Narration:    color-tinted card, raw CSS color
 */
const StatCard = React.memo(function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading = false,
  className,
}: StatCardProps) {
  const tw = isTailwindClass(color);

  return (
    <div
      className={clsx(
        "rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center gap-3",
        className,
      )}
    >
      {/* Icon box */}
      <div
        className={clsx(
          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
          tw && `${color.replace("text-", "bg-")}/10`,
        )}
        style={tw ? undefined : { background: iconBg(color) }}
      >
        <Icon
          size={14}
          className={tw ? color : undefined}
          style={tw ? undefined : { color }}
        />
      </div>

      {/* Value + label */}
      <div className="min-w-0">
        <span
          className={clsx("text-lg font-bold leading-tight", tw ? "text-white" : undefined)}
          style={tw ? undefined : { color: "white" }}
        >
          {loading ? "-" : value}
        </span>
        <p className="text-[10px] text-muted truncate">{label}</p>
      </div>
    </div>
  );
});

export { StatCard };
export type { StatCardProps };
