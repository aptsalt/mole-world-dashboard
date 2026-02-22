"use client";

import React from "react";
import { clsx } from "clsx";

// ── Types ────────────────────────────────────────────────────

interface FilterTab {
  key: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

// ── Component ────────────────────────────────────────────────

/**
 * Horizontal filter-tab strip with optional counts per tab.
 *
 * Covers the patterns in:
 *   - Narration:   simple text tabs (all / ready / active / done)
 *   - Production:  filter buttons with counts
 *   - Voices:      category tabs with counts + border style
 */
const FilterTabs = React.memo(function FilterTabs({
  tabs,
  active,
  onChange,
  className,
}: FilterTabsProps) {
  return (
    <div className={clsx("flex items-center gap-1 flex-wrap", className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={clsx(
              "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors border",
              isActive
                ? "bg-white/10 text-white border-white/20"
                : "bg-white/[0.02] text-muted border-white/[0.10] hover:bg-white/[0.05] hover:text-white/70",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export { FilterTabs };
export type { FilterTab, FilterTabsProps };
