import { create } from "zustand";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";
export type ErrorCategory = "network" | "automation" | "generation" | "distribution" | "system";

export interface TrackedError {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  source: string;
  details?: string;
  resolved: boolean;
}

interface ErrorTrackerStore {
  errors: TrackedError[];
  addError: (error: Omit<TrackedError, "id" | "timestamp" | "resolved">) => void;
  resolveError: (id: string) => void;
  clearResolved: () => void;
  clearAll: () => void;
}

export const useErrorTracker = create<ErrorTrackerStore>((set) => ({
  errors: [],
  addError: (error) => {
    const tracked: TrackedError = {
      ...error,
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    set((s) => ({ errors: [tracked, ...s.errors].slice(0, 200) }));
  },
  resolveError: (id) =>
    set((s) => ({
      errors: s.errors.map((e) => (e.id === id ? { ...e, resolved: true } : e)),
    })),
  clearResolved: () =>
    set((s) => ({ errors: s.errors.filter((e) => !e.resolved) })),
  clearAll: () => set({ errors: [] }),
}));

/** Helper to track errors from catch blocks */
export function trackError(
  category: ErrorCategory,
  message: string,
  source: string,
  severity: ErrorSeverity = "medium",
  details?: string,
) {
  useErrorTracker.getState().addError({ category, message, source, severity, details });
}
