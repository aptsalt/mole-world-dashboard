import React from "react";
import { clsx } from "clsx";

// ── Types ────────────────────────────────────────────────────

interface PageHeaderProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Background class for the icon box, e.g. "bg-cyan/10" */
  iconBg?: string;
  /** Text color class for the icon, e.g. "text-cyan" */
  iconColor?: string;
  title: string;
  subtitle?: string;
  /** Slot for action buttons rendered on the right */
  actions?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────

/**
 * Consistent page header with icon box, title, subtitle, and optional actions.
 *
 * Covers the patterns in:
 *   - Research:     gradient icon box + title + subtitle
 *   - Distribution: inline icon + title + subtitle + "Create Post" button
 *   - Voices:       inline icon + title + subtitle + "Refresh" button
 *   - Production:   icon box + title + subtitle + "Refresh" button
 *   - Narration:    icon box + title + subtitle + "Refresh" button
 */
const PageHeader = React.memo(function PageHeader({
  icon: Icon,
  iconBg = "bg-cyan/10",
  iconColor = "text-cyan",
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconBg,
          )}
        >
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
});

export { PageHeader };
export type { PageHeaderProps };
