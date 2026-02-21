"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Route → theme mapping:
 *   Navy (default)   — Dashboard, Local Production, Orchestrate, Research, System
 *   Warm Slate       — Higgsfield (/gallery, /production, /queue, /whatsapp)
 *   Soft Charcoal    — Distribution (/distribution/*)
 */

const SLATE_PREFIXES = ["/gallery", "/production", "/queue", "/whatsapp"];
const CHARCOAL_PREFIXES = ["/distribution"];

function resolveTheme(pathname: string): string | null {
  for (const prefix of CHARCOAL_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return "charcoal";
  }
  for (const prefix of SLATE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return "slate";
  }
  return null; // default navy — no attribute needed
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const theme = resolveTheme(pathname);
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [pathname]);

  return <>{children}</>;
}
