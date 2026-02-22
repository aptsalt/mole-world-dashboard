"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/lib/store";

export function ThemeProvider() {
  const theme = useDashboardStore((s) => s.preferences.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}
