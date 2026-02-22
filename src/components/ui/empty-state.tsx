import React from "react";
import { clsx } from "clsx";

// ── Types ────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

// ── Component ────────────────────────────────────────────────

/**
 * Centered empty-state placeholder with icon, title, optional description,
 * and optional action button.
 *
 * Matches the patterns in:
 *   - Distribution: queue empty (icon + title + action)
 *   - Distribution: activity empty (icon + title + subtitle)
 *   - Production:   media empty (icon + title + subtitle)
 */
const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx("flex flex-col items-center gap-2 py-8 text-center", className)}>
      <Icon size={20} className="text-white/10" />
      <p className="text-xs text-white/30">{title}</p>
      {description && (
        <p className="text-[9px] text-white/20">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="text-[10px] text-cyan/50 hover:text-cyan mt-1.5 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
});

export { EmptyState };
export type { EmptyStateProps };
