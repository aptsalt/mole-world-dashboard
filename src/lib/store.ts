import { create } from 'zustand';
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

interface DashboardStore {
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
}

export const useDashboardStore = create<DashboardStore>((set) => ({
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
    } catch {
      // Silently fail — automation may not be running
    }
  },
}));
