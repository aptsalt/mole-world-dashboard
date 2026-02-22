import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  PipelineStatus,
  RenderStats,
  Clip,
  Storyboard,
  VoiceData,
  AutomationServiceStatus,
  AutomationQueueItem,
  AutomationEvent,
} from './types';
import {
  getStatus,
  getStats,
  getClips,
  getStoryboard,
  getVoices,
  getAutomationStatus,
  getAutomationQueue,
  getAutomationEvents,
} from './api';
import { trackError } from './error-tracker';

// ── Preferences (persisted to localStorage) ───────────────────────

interface Preferences {
  sidebarExpanded: Record<string, boolean>;
  theme: string;
  refreshInterval: number;
}

const DEFAULT_PREFERENCES: Preferences = {
  sidebarExpanded: {},
  theme: 'dark',
  refreshInterval: 10000,
};

// ── Store interface ───────────────────────────────────────────────

interface DashboardStore {
  // Fetched data (NOT persisted)
  status: PipelineStatus | null;
  stats: RenderStats | null;
  clips: Clip[];
  storyboard: Storyboard | null;
  voices: VoiceData | null;
  automationStatus: AutomationServiceStatus | null;
  automationQueue: AutomationQueueItem[];
  automationEvents: AutomationEvent[];
  currentPage: string;
  isLoading: boolean;
  error: string | null;

  // Preferences (persisted)
  preferences: Preferences;

  // Data setters
  setStatus: (status: PipelineStatus) => void;
  setStats: (stats: RenderStats) => void;
  setClips: (clips: Clip[]) => void;
  setStoryboard: (storyboard: Storyboard) => void;
  setVoices: (voices: VoiceData) => void;
  setCurrentPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshAll: () => Promise<void>;
  refreshAutomation: () => Promise<void>;

  // Preference actions
  setTheme: (theme: string) => void;
  setRefreshInterval: (ms: number) => void;
  setSidebarExpanded: (key: string, expanded: boolean) => void;
}

// ── Store creation ────────────────────────────────────────────────

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      // Fetched data defaults
      status: null,
      stats: null,
      clips: [],
      storyboard: null,
      voices: null,
      automationStatus: null,
      automationQueue: [],
      automationEvents: [],
      currentPage: 'overview',
      isLoading: false,
      error: null,

      // Preferences defaults
      preferences: { ...DEFAULT_PREFERENCES },

      // Data setters
      setStatus: (status) => set({ status }),
      setStats: (stats) => set({ stats }),
      setClips: (clips) => set({ clips }),
      setStoryboard: (storyboard) => set({ storyboard }),
      setVoices: (voices) => set({ voices }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      refreshAll: async () => {
        set({ isLoading: true, error: null });
        try {
          const [status, stats, clips, storyboard, voices] = await Promise.all([
            getStatus(),
            getStats(),
            getClips(),
            getStoryboard(),
            getVoices(),
          ]);
          set({ status, stats, clips, storyboard, voices, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load data';
          set({ error: message, isLoading: false });
        }
      },

      refreshAutomation: async () => {
        try {
          const [automationStatus, automationQueue, automationEvents] = await Promise.all([
            getAutomationStatus(),
            getAutomationQueue(),
            getAutomationEvents(),
          ]);
          set({ automationStatus, automationQueue, automationEvents });
        } catch (err) {
          trackError("automation", "Failed to refresh automation data", "store/refreshAutomation", "low", String(err));
        }
      },

      // Preference actions
      setTheme: (theme) =>
        set((state) => ({
          preferences: { ...state.preferences, theme },
        })),

      setRefreshInterval: (ms) =>
        set((state) => ({
          preferences: { ...state.preferences, refreshInterval: ms },
        })),

      setSidebarExpanded: (key, expanded) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            sidebarExpanded: { ...state.preferences.sidebarExpanded, [key]: expanded },
          },
        })),
    }),
    {
      name: 'mole-world-preferences',
      storage: createJSONStorage(() => localStorage),
      // Only persist the preferences slice — never persist fetched data
      partialize: (state) => ({ preferences: state.preferences }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<DashboardStore>),
      }),
      skipHydration: false,
    },
  ),
);

// ── Derived selector hooks ────────────────────────────────────────

/** Progress percentages derived from pipeline status. */
export function useProgressStats() {
  const status = useDashboardStore((s) => s.status);

  const totalShots = status?.total_shots ?? 0;
  const v1Done = status?.v1?.done ?? 0;
  const v2Done = status?.v2?.done ?? 0;

  const v1Pct = totalShots > 0 ? Math.round((v1Done / totalShots) * 100) : 0;
  const v2Pct = totalShots > 0 ? Math.round((v2Done / totalShots) * 100) : 0;

  const totalDone = v1Done + v2Done;
  const totalRemaining = Math.max(0, totalShots * 2 - totalDone);

  return { v1Pct, v2Pct, totalDone, totalRemaining };
}

/** Summary stats derived from automation status and queue. */
export function useAutomationSummary() {
  const automationStatus = useDashboardStore((s) => s.automationStatus);
  const automationQueue = useDashboardStore((s) => s.automationQueue);

  const total = automationStatus?.queueStats?.total ?? automationQueue.length;
  const completedCount = automationStatus?.queueStats?.completed ?? 0;
  const failedCount = automationStatus?.queueStats?.failed ?? 0;
  const activeCount = automationStatus?.queueStats?.inProgress ?? 0;
  const pendingCount = automationStatus?.queueStats?.pending ?? 0;

  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  return { completedPct, activePct, failedCount, pendingCount, total };
}
