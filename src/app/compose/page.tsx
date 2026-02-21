"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Film,
  Sliders,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FileVideo,
  Layers,
  GripVertical,
  Plus,
  Trash2,
  Eye,
  Download,
  Volume2,
  Search,
  X,
  HelpCircle,
  Scissors,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  List,
  Maximize2,
  ChevronDown,
  Sparkles,
  LayoutGrid,
  Clock,
  Music,
  Clapperboard,
  AlertTriangle,
  Wifi,
  WifiOff,
  Undo2,
  Redo2,
  Keyboard,
  Copy,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { getSceneColor, formatDuration, formatBytes } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────── */

interface ComposeClip {
  path: string;
  url: string;
  filename: string;
  shot_id: string;
  scene_id: string;
  source: string;
  duration: number | null;
  has_audio: boolean;
  audio_path: string | null;
  size_bytes: number;
}

interface TimelineClip extends ComposeClip {
  id: string;
  trimStart: number;
  trimEnd: number;
  speed: number;
  fadeIn: number;
  fadeOut: number;
}

interface SavedComposition {
  path: string;
  url: string;
  name: string;
  filename: string;
  is_sample: boolean;
  duration: number | null;
  size_bytes: number;
}

/* ── Helpers ────────────────────────────────────────────────── */

function filesUrlToMedia(filesUrl: string): string {
  if (filesUrl.startsWith("/files/")) return "/api/media/" + filesUrl.slice(7);
  return filesUrl;
}

async function composeApi<T = Record<string, unknown>>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api/compose${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function audioUrlFromClip(clip: { has_audio: boolean; shot_id: string }): string | null {
  if (!clip.has_audio) return null;
  return `/api/media/audio_voiced/${clip.shot_id}.wav`;
}

function timecodeFromSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const f = Math.floor((sec % 1) * 24);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

/* ── Walkthrough ────────────────────────────────────────────── */

const WALKTHROUGH = [
  { title: "Welcome to Composition Studio", desc: "A DaVinci Resolve-inspired editor for assembling your AI film. The layout mirrors professional NLE workflows.", Icon: Clapperboard },
  { title: "Media Pool", desc: "Browse all available clips on the left. Filter by scene, switch between grid and list view, or search by shot ID.", Icon: LayoutGrid },
  { title: "Source Monitor", desc: "Click any clip to preview it in the source monitor. Use transport controls to scrub through footage.", Icon: Eye },
  { title: "Timeline", desc: "Drag clips to reorder. Select a clip to edit properties in the Inspector. The time ruler shows total duration.", Icon: Layers },
  { title: "Inspector & Compose", desc: "Adjust trim, speed, and fades per clip. Set crossfade and narration, then hit Compose to render.", Icon: Sparkles },
];

/* ── Main Component ─────────────────────────────────────────── */

export default function ComposePage() {
  const { storyboard, refreshAll } = useDashboardStore();

  // Data
  const [composeClips, setComposeClips] = useState<ComposeClip[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [savedComps, setSavedComps] = useState<SavedComposition[]>([]);

  // Filters
  const [sceneFilter, setSceneFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Settings
  const [crossfade, setCrossfade] = useState(0.5);
  const [includeNarration, setIncludeNarration] = useState(true);
  const [narrationVolume, setNarrationVolume] = useState(0.7);
  const [composeName, setComposeName] = useState("chapter1_composed");

  // UI
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const [composeMsg, setComposeMsg] = useState("");
  const [outputSrc, setOutputSrc] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [showComposePanel, setShowComposePanel] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [rightPanel, setRightPanel] = useState<"inspector" | "saved">("inspector");
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [undoStack, setUndoStack] = useState<TimelineClip[][]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [poolDragClip, setPoolDragClip] = useState<ComposeClip | null>(null);
  const [timelineDropHover, setTimelineDropHover] = useState(false);

  const previewRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const outputRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ──────────────────────────────────────────────── */

  const fetchClips = useCallback(async () => {
    setApiStatus("loading");
    try {
      const data = await composeApi<{ clips: ComposeClip[] }>("/clips");
      setComposeClips(data.clips || []);
      setApiStatus("connected");
    } catch {
      setApiStatus("disconnected");
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      const data = await composeApi<SavedComposition[]>("/list");
      setSavedComps(Array.isArray(data) ? data : []);
    } catch { /* follows apiStatus from fetchClips */ }
  }, []);

  useEffect(() => {
    if (!storyboard) refreshAll();
    fetchClips();
    fetchSaved();
    if (!localStorage.getItem("compose-walkthrough-v2")) setShowWalkthrough(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-retry when disconnected ────────────────────── */

  useEffect(() => {
    if (apiStatus !== "disconnected") return;
    const timer = setInterval(() => {
      fetchClips();
      fetchSaved();
    }, 5000);
    return () => clearInterval(timer);
  }, [apiStatus, fetchClips, fetchSaved]);

  /* ── Derived ────────────────────────────────────────────── */

  const scenes = useMemo(
    () => Array.from(new Set(composeClips.map((c) => c.scene_id).filter(Boolean))).sort(),
    [composeClips]
  );

  const filteredClips = useMemo(() => {
    let r = composeClips;
    if (sceneFilter !== "all") r = r.filter((c) => c.scene_id === sceneFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter((c) => c.shot_id.toLowerCase().includes(q) || c.scene_id.toLowerCase().includes(q));
    }
    return r;
  }, [composeClips, sceneFilter, searchQuery]);

  const timelineDuration = useMemo(
    () => timelineClips.reduce((sum, c) => sum + (c.trimEnd - c.trimStart) / c.speed, 0),
    [timelineClips]
  );

  const selectedClip = selectedIdx >= 0 && selectedIdx < timelineClips.length ? timelineClips[selectedIdx] : null;

  /* ── Timeline actions ───────────────────────────────────── */

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), timelineClips]);
  }, [timelineClips]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setTimelineClips(last);
      setSelectedIdx(-1);
      return prev.slice(0, -1);
    });
  }, []);

  const addToTimeline = useCallback((clip: ComposeClip) => {
    pushUndo();
    const dur = clip.duration ?? 5;
    setTimelineClips((prev) => [...prev, {
      ...clip, id: `${clip.shot_id}_${Date.now()}`,
      trimStart: 0, trimEnd: dur, speed: 1, fadeIn: 0, fadeOut: 0,
    }]);
  }, [pushUndo]);

  const addAllFiltered = useCallback(() => {
    pushUndo();
    setTimelineClips((prev) => [
      ...prev,
      ...filteredClips.map((clip, i) => ({
        ...clip, id: `${clip.shot_id}_${Date.now()}_${i}`,
        trimStart: 0, trimEnd: clip.duration ?? 5, speed: 1, fadeIn: 0, fadeOut: 0,
      })),
    ]);
  }, [filteredClips, pushUndo]);

  const removeFromTimeline = useCallback((idx: number) => {
    pushUndo();
    setTimelineClips((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx((prev) => (prev === idx ? -1 : prev > idx ? prev - 1 : prev));
  }, [pushUndo]);

  const clearTimeline = useCallback(() => { pushUndo(); setTimelineClips([]); setSelectedIdx(-1); }, [pushUndo]);

  const updateClipProp = useCallback((idx: number, u: Partial<TimelineClip>) => {
    setTimelineClips((prev) => prev.map((c, i) => (i === idx ? { ...c, ...u } : c)));
  }, []);

  const duplicateClip = useCallback((idx: number) => {
    pushUndo();
    setTimelineClips((prev) => {
      const clip = prev[idx];
      if (!clip) return prev;
      const copy = { ...clip, id: `${clip.shot_id}_${Date.now()}_dup` };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }, [pushUndo]);

  /* ── Drag & drop ────────────────────────────────────────── */

  const onDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const onDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); }, []);
  const onDrop = useCallback((idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    setTimelineClips((prev) => { const n = [...prev]; const [m] = n.splice(dragIdx, 1); n.splice(idx, 0, m); return n; });
    setDragIdx(null); setDragOverIdx(null);
  }, [dragIdx]);
  const onDragEnd = useCallback(() => { setDragIdx(null); setDragOverIdx(null); }, []);

  /* ── Preview / Transport ────────────────────────────────── */

  const previewClip = useCallback((clip: ComposeClip | TimelineClip) => {
    const src = filesUrlToMedia(clip.url);
    setPreviewSrc(src);
    setPreviewLabel(clip.shot_id);
    setIsPlaying(true);
    const video = previewRef.current;
    const audio = previewAudioRef.current;
    if (video) {
      video.src = src;
      video.load();
      // Load matching narration audio
      const audioSrc = audioUrlFromClip(clip);
      if (audio && audioSrc) {
        audio.src = audioSrc;
        audio.load();
      } else if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      const tryPlay = () => {
        video.currentTime = 0;
        video.play().catch(() => { setIsPlaying(false); });
        if (audio && audioSrc) { audio.currentTime = 0; audio.play().catch(() => {}); }
      };
      video.addEventListener("canplay", tryPlay, { once: true });
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = previewRef.current;
    const audio = previewAudioRef.current;
    if (!video) return;
    if (video.paused) {
      if (audio?.src) { audio.currentTime = video.currentTime; audio.play().catch(() => {}); }
      video.play(); setIsPlaying(true);
    } else {
      video.pause(); setIsPlaying(false);
      if (audio?.src) audio.pause();
    }
  }, []);

  const skipBack = useCallback(() => {
    const video = previewRef.current;
    const audio = previewAudioRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 2);
      if (audio?.src) audio.currentTime = video.currentTime;
    }
  }, []);

  const skipForward = useCallback(() => {
    const video = previewRef.current;
    const audio = previewAudioRef.current;
    if (video) {
      video.currentTime += 2;
      if (audio?.src) audio.currentTime = video.currentTime;
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const video = previewRef.current;
    if (video) {
      setPreviewTime(video.currentTime);
      setPreviewDuration(video.duration || 0);
      const audio = previewAudioRef.current;
      if (audio?.src && !audio.paused && Math.abs(audio.currentTime - video.currentTime) > 0.3) {
        audio.currentTime = video.currentTime;
      }
    }
  }, []);

  /* ── Compose ────────────────────────────────────────────── */

  const startComposition = useCallback(async () => {
    if (timelineClips.length === 0) return;
    setIsComposing(true);
    setComposeMsg("Rendering with FFmpeg...");
    try {
      const result = await composeApi<{
        status: string; output_url: string; name: string; duration: number; size_bytes: number;
      }>("/create", {
        method: "POST",
        body: JSON.stringify({
          name: composeName, clips: timelineClips.map((c) => c.path),
          crossfade, include_audio: includeNarration, narration_volume: narrationVolume,
        }),
      });
      if (result.status === "success" && result.output_url) {
        setOutputSrc(filesUrlToMedia(result.output_url));
        setOutputName(result.name || composeName);
        setShowOutput(true);
        setShowComposePanel(false);
        setComposeMsg("");
        fetchSaved();
        const vid = outputRef.current;
        if (vid) {
          vid.addEventListener("canplay", () => { vid.play().catch(() => {}); }, { once: true });
        }
      } else {
        setComposeMsg("Composition failed");
      }
    } catch (err) {
      setComposeMsg(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsComposing(false);
    }
  }, [timelineClips, composeName, crossfade, includeNarration, narrationVolume, fetchSaved]);

  /* ── Saved ──────────────────────────────────────────────── */

  const playSaved = useCallback((c: SavedComposition) => {
    const src = filesUrlToMedia(c.url);
    setOutputSrc(src);
    setOutputName(c.name);
    setShowOutput(true);
    const video = outputRef.current;
    if (video) {
      video.src = src;
      video.load();
      video.addEventListener("canplay", () => { video.play().catch(() => {}); }, { once: true });
    }
  }, []);

  const deleteSaved = useCallback(async (name: string) => {
    try { await composeApi(`/${name}`, { method: "DELETE" }); fetchSaved(); } catch { /* ignore */ }
  }, [fetchSaved]);

  /* ── Walkthrough ────────────────────────────────────────── */

  const closeWalkthrough = useCallback(() => {
    setShowWalkthrough(false);
    localStorage.setItem("compose-walkthrough-v2", "1");
  }, []);

  /* ── Keyboard Shortcuts ──────────────────────────────────── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "Delete":
        case "Backspace":
          if (selectedIdx >= 0) removeFromTimeline(selectedIdx);
          break;
        case "ArrowLeft":
          if (e.shiftKey) skipBack();
          else if (selectedIdx > 0) setSelectedIdx(selectedIdx - 1);
          break;
        case "ArrowRight":
          if (e.shiftKey) skipForward();
          else if (selectedIdx < timelineClips.length - 1) setSelectedIdx(selectedIdx + 1);
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); undo(); }
          break;
        case "d":
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); if (selectedIdx >= 0) duplicateClip(selectedIdx); }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); addAllFiltered(); }
          break;
        case "Escape":
          if (showOutput) setShowOutput(false);
          else if (showComposePanel) setShowComposePanel(false);
          else if (showShortcuts) setShowShortcuts(false);
          else if (showWalkthrough) closeWalkthrough();
          else setSelectedIdx(-1);
          break;
        case "?":
          setShowShortcuts((p) => !p);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, timelineClips.length, togglePlay, skipBack, skipForward, undo, duplicateClip, addAllFiltered, removeFromTimeline, showOutput, showComposePanel, showShortcuts, showWalkthrough, closeWalkthrough]);

  /* ── Render ─────────────────────────────────────────────── */

  const clipWidth = (clip: TimelineClip) => Math.max(((clip.trimEnd - clip.trimStart) / clip.speed) * 20 * timelineZoom, 48);

  return (
    <div className="flex flex-col animate-fade-in overflow-hidden" style={{ height: "calc(100vh - 80px)" }}>

      {/* ── API Status Banner ────────────────────────────── */}
      {apiStatus === "disconnected" && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 shrink-0">
          <WifiOff size={12} className="text-amber-400" />
          <span className="text-[11px] text-amber-300">Compose API offline — start the pipeline server (port 5555) to load clips</span>
          <button onClick={() => { fetchClips(); fetchSaved(); }}
            className="ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition">
            Retry
          </button>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ─────────────────────── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="glass p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-cyan" />
                <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="p-1 text-muted hover:text-white"><X size={14} /></button>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                ["Space", "Play / Pause"],
                ["←  →", "Select prev / next clip"],
                ["Shift + ← →", "Skip 2s in preview"],
                ["Delete", "Remove selected clip"],
                ["Ctrl+Z", "Undo timeline change"],
                ["Ctrl+D", "Duplicate selected clip"],
                ["Ctrl+A", "Add all filtered clips"],
                ["Esc", "Close panel / deselect"],
                ["?", "Toggle this dialog"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1 border-b border-white/5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/8 text-[10px] font-mono text-cyan">{key}</kbd>
                  <span className="text-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Walkthrough Overlay ───────────────────────────── */}
      {showWalkthrough && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="glass p-8 max-w-md w-full mx-4 space-y-6">
            {(() => { const s = WALKTHROUGH[walkthroughStep]; const I = s.Icon; return (
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-cyan/10 flex items-center justify-center">
                  <I size={28} className="text-cyan" />
                </div>
                <h3 className="text-lg font-bold text-white">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ); })()}
            <div className="flex justify-center gap-1.5">
              {WALKTHROUGH.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === walkthroughStep ? "bg-cyan w-6" : "bg-white/20 w-1.5"}`} />
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={closeWalkthrough} className="text-xs text-muted hover:text-white transition">Skip</button>
              <button onClick={() => walkthroughStep < WALKTHROUGH.length - 1 ? setWalkthroughStep((p) => p + 1) : closeWalkthrough()}
                className="px-4 py-1.5 rounded-lg bg-cyan text-black text-xs font-semibold hover:brightness-110 transition">
                {walkthroughStep < WALKTHROUGH.length - 1 ? "Next" : "Get Started"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Output Overlay ────────────────────────────────── */}
      {showOutput && outputSrc && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Film size={16} className="text-cyan" />
                <span className="text-sm font-semibold text-white">{outputName}</span>
                <span className="badge badge-v1">Composed</span>
              </div>
              <div className="flex items-center gap-3">
                <a href={outputSrc} download className="flex items-center gap-1.5 text-xs text-muted hover:text-cyan transition">
                  <Download size={12} /> Download
                </a>
                <button onClick={() => setShowOutput(false)} className="p-1 text-muted hover:text-white transition">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <video ref={outputRef} src={outputSrc} controls className="w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* ── Compose Settings Panel (slide-over) ──────────── */}
      {showComposePanel && (
        <div className="fixed inset-0 z-[200]" onClick={() => setShowComposePanel(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-bg-light border-l border-white/8 p-5 space-y-5 overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-cyan" />
                <span className="text-sm font-semibold text-white">Render Settings</span>
              </div>
              <button onClick={() => setShowComposePanel(false)} className="p-1 text-muted hover:text-white"><X size={14} /></button>
            </div>

            <SliderField label="Crossfade" value={crossfade} min={0} max={2} step={0.1} onChange={setCrossfade} />
            <SliderField label="Narration Volume" value={narrationVolume} min={0} max={1} step={0.05}
              suffix="%" format={(v) => `${Math.round(v * 100)}%`} onChange={setNarrationVolume} />

            <ToggleRow label="Include Narration" active={includeNarration} onToggle={() => setIncludeNarration(!includeNarration)} />

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted">Output Name</label>
              <input type="text" value={composeName} onChange={(e) => setComposeName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-sm text-white focus:outline-none focus:border-cyan/30" />
            </div>

            <button onClick={startComposition} disabled={isComposing || timelineClips.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                isComposing || timelineClips.length === 0
                  ? "bg-white/10 text-muted cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan to-cyan/80 text-black hover:brightness-110"
              }`}>
              <Film size={16} />
              {isComposing ? "Composing..." : `Compose (${timelineClips.length} clips)`}
            </button>

            {composeMsg && <div className={`text-xs ${composeMsg.startsWith("Error") ? "text-error" : "text-cyan animate-pulse"}`}>{composeMsg}</div>}

            {/* Saved compositions inside panel */}
            <div className="border-t border-white/8 pt-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <FileVideo size={12} className="text-cyan" />
                <span className="text-xs font-semibold text-white">Saved Compositions</span>
                <span className="ml-auto text-[10px] text-muted">{savedComps.length}</span>
              </div>
              {savedComps.map((c) => (
                <div key={c.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition group text-xs">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playSaved(c)}>
                    <div className="font-medium text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-muted">{c.duration ? formatDuration(c.duration) : "?"} · {formatBytes(c.size_bytes)}{c.is_sample && <span className="text-cyan ml-1">· sample</span>}</div>
                  </div>
                  <button onClick={() => playSaved(c)} className="p-0.5 text-muted hover:text-cyan transition"><Play size={10} /></button>
                  <button onClick={() => deleteSaved(c.name)} className="p-0.5 text-muted hover:text-error transition opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TOP SECTION — Media Pool + Source Monitor + Inspector
         ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">

        {/* ── Media Pool (left) ──────────────────────────── */}
        <div className="w-64 xl:w-72 border-r border-white/8 flex flex-col bg-bg-light/50 shrink-0">
          {/* Media Pool Header */}
          <div className="px-3 py-2 border-b border-white/8 flex items-center gap-2">
            <LayoutGrid size={12} className="text-cyan" />
            <span className="text-xs font-semibold text-white">Media Pool</span>
            <span className="ml-auto text-[10px] text-muted">{filteredClips.length}</span>
            <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-1 text-muted hover:text-cyan transition" title={viewMode === "grid" ? "List view" : "Grid view"}>
              {viewMode === "grid" ? <List size={12} /> : <Grid3X3 size={12} />}
            </button>
          </div>

          {/* Search + Scene filter */}
          <div className="px-3 py-2 space-y-2 border-b border-white/8">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/50" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-2 py-1 rounded bg-white/5 border border-white/6 text-xs text-white placeholder:text-muted/40 focus:outline-none focus:border-cyan/30" />
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterPill label="All" active={sceneFilter === "all"} onClick={() => setSceneFilter("all")} />
              {scenes.map((s) => (
                <FilterPill key={s} label={s} active={sceneFilter === s} onClick={() => setSceneFilter(s)}
                  color={getSceneColor(s)} />
              ))}
            </div>
          </div>

          {/* Add All bar */}
          {filteredClips.length > 0 && (
            <button onClick={addAllFiltered}
              className="mx-3 mt-2 mb-1 py-1 rounded bg-cyan/8 text-cyan text-[10px] font-medium hover:bg-cyan/15 transition flex items-center justify-center gap-1">
              <Plus size={10} /> Add All ({filteredClips.length})
            </button>
          )}

          {/* Clip list / grid */}
          <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1">
            {viewMode === "list" ? (
              <div className="space-y-0.5">
                {filteredClips.map((clip, idx) => (
                  <div key={`${clip.shot_id}_${clip.source}_${idx}`}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; setPoolDragClip(clip); }}
                    onDragEnd={() => setPoolDragClip(null)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-white/[0.06] transition cursor-pointer group"
                    onClick={() => previewClip(clip)}
                    onDoubleClick={() => addToTimeline(clip)}>
                    <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: getSceneColor(clip.scene_id) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-white truncate">{clip.shot_id}</div>
                      <div className="text-[9px] text-muted truncate">
                        {clip.duration ? `${clip.duration.toFixed(1)}s` : "?"} · {clip.source === "v1_standard" ? "V1" : "V0"}
                        {clip.has_audio && <span className="text-cyan ml-1">♪</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addToTimeline(clip); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-cyan/10 text-cyan hover:bg-cyan/20 transition" title="Add to timeline (or double-click)">
                      <Plus size={10} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 py-1">
                {filteredClips.map((clip, idx) => (
                  <div key={`${clip.shot_id}_${clip.source}_${idx}`}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; setPoolDragClip(clip); }}
                    onDragEnd={() => setPoolDragClip(null)}
                    className="rounded-lg overflow-hidden cursor-pointer group hover:ring-1 hover:ring-cyan/30 transition"
                    onClick={() => previewClip(clip)}
                    onDoubleClick={() => addToTimeline(clip)}>
                    <div className="h-12 flex items-center justify-center relative"
                      style={{ background: `linear-gradient(135deg, ${getSceneColor(clip.scene_id)}30, ${getSceneColor(clip.scene_id)}10)` }}>
                      <Play size={14} className="text-white/30 group-hover:text-white/60 transition" />
                      {clip.has_audio && <Music size={8} className="absolute top-1 right-1 text-cyan/60" />}
                      <button onClick={(e) => { e.stopPropagation(); addToTimeline(clip); }}
                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-cyan/80 text-black transition">
                        <Plus size={8} />
                      </button>
                    </div>
                    <div className="px-1.5 py-1 bg-white/[0.03]">
                      <div className="text-[9px] font-medium text-white truncate">{clip.shot_id}</div>
                      <div className="text-[8px] text-muted">{clip.duration ? `${clip.duration.toFixed(1)}s` : "?"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {filteredClips.length === 0 && (
              <div className="text-center py-6 space-y-2">
                {apiStatus === "disconnected" ? (
                  <>
                    <WifiOff size={20} className="mx-auto text-amber-400/40" />
                    <p className="text-[10px] text-amber-300/60">Server offline</p>
                    <button onClick={() => { fetchClips(); fetchSaved(); }}
                      className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300/60 hover:text-amber-300 transition">
                      Retry Connection
                    </button>
                  </>
                ) : apiStatus === "loading" ? (
                  <>
                    <div className="mx-auto w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
                    <p className="text-[10px] text-muted">Loading clips...</p>
                  </>
                ) : (
                  <p className="text-[10px] text-muted">No clips found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Source Monitor (center) ────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Monitor header */}
          <div className="px-4 py-1.5 border-b border-white/8 flex items-center gap-3 bg-bg/60">
            <div className="flex items-center gap-1.5">
              <Eye size={11} className="text-cyan" />
              <span className="text-[11px] font-semibold text-white">Source Monitor</span>
            </div>
            {previewLabel && <span className="text-[10px] text-muted">{previewLabel}</span>}
            <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted">
              <span>{timecodeFromSec(previewTime)}</span>
              <span className="text-white/20">/</span>
              <span>{timecodeFromSec(previewDuration)}</span>
            </div>
          </div>

          {/* Video area */}
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-0">
            <audio ref={previewAudioRef} className="hidden" />
            <video ref={previewRef} onTimeUpdate={onTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => { setIsPlaying(false); if (previewAudioRef.current?.src) previewAudioRef.current.pause(); }}
              onEnded={() => { setIsPlaying(false); if (previewAudioRef.current?.src) previewAudioRef.current.pause(); }}
              onError={() => setIsPlaying(false)}
              className={previewSrc ? "max-w-full max-h-full object-contain" : "hidden"} />
            {!previewSrc && (
              <div className="text-center text-muted/40">
                <Clapperboard size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs">Select a clip from the Media Pool</p>
              </div>
            )}
          </div>

          {/* Transport controls */}
          <div className="px-4 py-1.5 border-t border-white/8 bg-bg/60 flex items-center gap-2">
            {/* Progress bar */}
            <div className="flex-1 h-1 bg-white/8 rounded-full cursor-pointer relative group"
              onClick={(e) => {
                if (!previewRef.current || !previewDuration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const newTime = pct * previewDuration;
                previewRef.current.currentTime = newTime;
                if (previewAudioRef.current?.src) previewAudioRef.current.currentTime = newTime;
              }}>
              <div className="h-full bg-cyan rounded-full transition-all"
                style={{ width: previewDuration ? `${(previewTime / previewDuration) * 100}%` : "0%" }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-cyan rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"
                style={{ left: previewDuration ? `calc(${(previewTime / previewDuration) * 100}% - 5px)` : "0" }} />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1 ml-2">
              <button onClick={skipBack} className="p-1 text-muted hover:text-white transition"><SkipBack size={14} /></button>
              <button onClick={togglePlay}
                className="p-1.5 rounded-full bg-white/10 text-white hover:bg-cyan/20 hover:text-cyan transition">
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button onClick={skipForward} className="p-1 text-muted hover:text-white transition"><SkipForward size={14} /></button>
            </div>
          </div>
        </div>

        {/* ── Inspector (right) ──────────────────────────── */}
        <div className="w-60 xl:w-64 border-l border-white/8 flex flex-col bg-bg-light/50 shrink-0">
          {/* Tab bar */}
          <div className="flex border-b border-white/8">
            <button onClick={() => setRightPanel("inspector")}
              className={`flex-1 py-2 text-[10px] font-semibold transition ${rightPanel === "inspector" ? "text-cyan border-b-2 border-cyan" : "text-muted hover:text-white"}`}>
              Inspector
            </button>
            <button onClick={() => setRightPanel("saved")}
              className={`flex-1 py-2 text-[10px] font-semibold transition ${rightPanel === "saved" ? "text-cyan border-b-2 border-cyan" : "text-muted hover:text-white"}`}>
              Library ({savedComps.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            {rightPanel === "inspector" ? (
              selectedClip ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSceneColor(selectedClip.scene_id) }} />
                    <span className="text-xs font-semibold text-white">{selectedClip.shot_id}</span>
                  </div>
                  <div className="text-[10px] text-muted space-y-0.5">
                    <div>Source: {selectedClip.source === "v1_standard" ? "V1 Standard" : selectedClip.source}</div>
                    <div>Duration: {selectedClip.duration?.toFixed(1)}s</div>
                    <div>Audio: {selectedClip.has_audio ? "Yes" : "No"}</div>
                  </div>

                  <div className="border-t border-white/8 pt-3 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Transform</span>
                    <SliderField label="Trim In" value={selectedClip.trimStart} min={0} max={selectedClip.trimEnd - 0.1} step={0.1}
                      onChange={(v) => updateClipProp(selectedIdx, { trimStart: v })} />
                    <SliderField label="Trim Out" value={selectedClip.trimEnd} min={selectedClip.trimStart + 0.1} max={selectedClip.duration ?? 10} step={0.1}
                      onChange={(v) => updateClipProp(selectedIdx, { trimEnd: v })} />
                    <SliderField label="Speed" value={selectedClip.speed} min={0.25} max={4} step={0.25} suffix="x"
                      format={(v) => `${v.toFixed(2)}x`} onChange={(v) => updateClipProp(selectedIdx, { speed: v })} />
                  </div>

                  <div className="border-t border-white/8 pt-3 space-y-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Transitions</span>
                    <SliderField label="Fade In" value={selectedClip.fadeIn} min={0} max={2} step={0.1}
                      onChange={(v) => updateClipProp(selectedIdx, { fadeIn: v })} />
                    <SliderField label="Fade Out" value={selectedClip.fadeOut} min={0} max={2} step={0.1}
                      onChange={(v) => updateClipProp(selectedIdx, { fadeOut: v })} />
                  </div>

                  <button onClick={() => previewClip(selectedClip)}
                    className="w-full py-1.5 rounded bg-white/5 text-[10px] text-muted hover:text-cyan hover:bg-cyan/5 transition flex items-center justify-center gap-1">
                    <Play size={10} /> Preview
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Scissors size={20} className="mx-auto mb-2 text-muted/20" />
                  <p className="text-[10px] text-muted">Select a clip in the timeline<br />to edit its properties</p>
                </div>
              )
            ) : (
              /* Saved compositions */
              <div className="space-y-1.5">
                {savedComps.length === 0 ? (
                  <div className="text-[10px] text-muted text-center py-8">No saved compositions</div>
                ) : (
                  savedComps.map((c) => (
                    <div key={c.name}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-white/[0.06] transition group cursor-pointer"
                      onClick={() => playSaved(c)}>
                      <FileVideo size={12} className="text-cyan/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-white truncate">{c.name}</div>
                        <div className="text-[9px] text-muted">
                          {c.duration ? formatDuration(c.duration) : "?"} · {formatBytes(c.size_bytes)}
                          {c.is_sample && <span className="text-cyan ml-1">sample</span>}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteSaved(c.name); }}
                        className="p-0.5 text-muted hover:text-error transition opacity-0 group-hover:opacity-100">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BOTTOM — Timeline
         ══════════════════════════════════════════════════════ */}
      <div className="border-t border-white/10 flex flex-col shrink-0" style={{ flex: "0 0 36%" }}>

        {/* Timeline toolbar */}
        <div className="px-3 py-1.5 border-b border-white/8 flex items-center gap-2 bg-bg/80">
          <Layers size={12} className="text-cyan" />
          <span className="text-[11px] font-semibold text-white">Timeline</span>
          <span className="text-[10px] text-muted ml-1">
            {timelineClips.length} clips · {formatDuration(timelineDuration)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Undo */}
            <button onClick={undo} disabled={undoStack.length === 0}
              className={`p-1 transition ${undoStack.length > 0 ? "text-muted hover:text-white" : "text-white/10 cursor-not-allowed"}`}
              title="Undo (Ctrl+Z)"><Undo2 size={12} /></button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Zoom */}
            <button onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1 text-muted hover:text-white transition" title="Zoom out"><ZoomOut size={12} /></button>
            <span className="text-[9px] text-muted font-mono w-8 text-center">{Math.round(timelineZoom * 100)}%</span>
            <button onClick={() => setTimelineZoom((z) => Math.min(3, z + 0.25))}
              className="p-1 text-muted hover:text-white transition" title="Zoom in"><ZoomIn size={12} /></button>

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {filteredClips.length > 0 && (
              <button onClick={addAllFiltered}
                className="px-2 py-0.5 rounded text-[9px] text-cyan bg-cyan/8 hover:bg-cyan/15 transition" title="Ctrl+A">
                + Add All
              </button>
            )}

            {timelineClips.length > 0 && (
              <button onClick={clearTimeline}
                className="px-2 py-0.5 rounded text-[9px] text-muted hover:text-error bg-white/5 hover:bg-error/10 transition">
                Clear
              </button>
            )}

            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Compose button */}
            <button onClick={() => setShowComposePanel(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition ${
                timelineClips.length === 0
                  ? "bg-white/10 text-muted cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan to-cyan/80 text-black hover:brightness-110"
              }`}
              disabled={timelineClips.length === 0}>
              <Film size={11} /> Compose
            </button>

            {/* Guide & Shortcuts */}
            <button onClick={() => { setWalkthroughStep(0); setShowWalkthrough(true); }}
              className="p-1 text-muted hover:text-cyan transition" title="Guide">
              <HelpCircle size={12} />
            </button>
            <button onClick={() => setShowShortcuts(true)}
              className="p-1 text-muted hover:text-cyan transition" title="Keyboard shortcuts (?)">
              <Keyboard size={12} />
            </button>
          </div>
        </div>

        {/* Time ruler */}
        <div className="px-3 h-5 border-b border-white/6 bg-bg/40 flex items-end overflow-x-auto relative">
          {(() => {
            const totalSec = Math.max(timelineDuration, 10);
            const marks: React.ReactNode[] = [];
            const step = timelineZoom >= 1.5 ? 2 : timelineZoom >= 0.75 ? 5 : 10;
            for (let t = 0; t <= totalSec; t += step) {
              const left = t * 20 * timelineZoom;
              marks.push(
                <div key={t} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${left}px` }}>
                  <span className="text-[8px] text-muted/60 font-mono mb-0.5">{t}s</span>
                  <div className="w-px h-1.5 bg-white/15" />
                </div>
              );
            }
            return <div className="relative h-full" style={{ minWidth: `${totalSec * 20 * timelineZoom + 40}px` }}>{marks}</div>;
          })()}
        </div>

        {/* Timeline tracks */}
        <div ref={timelineRef}
          className={`flex-1 overflow-auto min-h-0 px-3 py-2 bg-bg transition-colors ${timelineDropHover ? "bg-cyan/[0.03]" : ""}`}
          onDragOver={(e) => { if (poolDragClip) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setTimelineDropHover(true); } }}
          onDragLeave={() => setTimelineDropHover(false)}
          onDrop={() => { if (poolDragClip) { addToTimeline(poolDragClip); setPoolDragClip(null); setTimelineDropHover(false); } }}>
          {timelineClips.length === 0 ? (
            <div className={`h-full flex items-center justify-center border border-dashed rounded-lg transition-all ${
              timelineDropHover ? "border-cyan/40 bg-cyan/[0.03]" : "border-white/8"
            }`}>
              <div className="text-center space-y-2">
                {timelineDropHover ? (
                  <>
                    <Plus size={24} className="mx-auto text-cyan/60 animate-pulse" />
                    <p className="text-[11px] text-cyan/60 font-medium">Drop to add clip</p>
                  </>
                ) : (
                  <>
                    <Film size={20} className="mx-auto text-muted/20" />
                    <p className="text-[10px] text-muted/40">Drag clips here or double-click in Media Pool</p>
                    <p className="text-[8px] text-muted/25">Ctrl+A to add all filtered clips</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Video track */}
              <div className="flex items-center gap-0.5">
                <div className="w-12 shrink-0 text-[8px] text-muted/50 font-mono text-right pr-1.5">V1</div>
                <div className="flex-1 flex gap-px overflow-x-auto pb-1">
                  {timelineClips.map((clip, idx) => {
                    const w = clipWidth(clip);
                    const sel = idx === selectedIdx;
                    const dragging = idx === dragIdx;
                    const over = idx === dragOverIdx;
                    const effectiveDur = (clip.trimEnd - clip.trimStart) / clip.speed;
                    const sceneColor = getSceneColor(clip.scene_id);

                    return (
                      <div key={clip.id} draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)}
                        onDrop={() => onDrop(idx)} onDragEnd={onDragEnd}
                        onClick={() => setSelectedIdx(idx === selectedIdx ? -1 : idx)}
                        onDoubleClick={() => previewClip(clip)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedIdx(idx);
                        }}
                        className={`relative shrink-0 rounded cursor-pointer transition-all select-none group ${
                          sel ? "ring-1 ring-cyan shadow-[0_0_8px_rgba(137,180,250,0.15)] z-10" : ""
                        } ${dragging ? "opacity-30 scale-95" : ""} ${over ? "ring-1 ring-cyan/40" : ""}`}
                        style={{ width: `${w}px` }}>
                        {/* Clip body */}
                        <div className="h-14 rounded overflow-hidden" style={{
                          background: `linear-gradient(180deg, ${sceneColor}25 0%, ${sceneColor}08 100%)`,
                          borderTop: `2px solid ${sceneColor}`,
                        }}>
                          <div className="px-1.5 pt-1 flex items-center gap-1">
                            <GripVertical size={8} className="text-white/20 cursor-grab shrink-0" />
                            <span className="text-[9px] font-medium text-white/80 truncate">{clip.shot_id}</span>
                            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                              <button onClick={(e) => { e.stopPropagation(); duplicateClip(idx); }}
                                className="text-white/30 hover:text-cyan transition" title="Duplicate (Ctrl+D)">
                                <Copy size={8} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); removeFromTimeline(idx); }}
                                className="text-white/30 hover:text-error transition" title="Remove (Del)">
                                <X size={8} />
                              </button>
                            </div>
                          </div>
                          <div className="px-1.5 mt-0.5 text-[8px] text-white/40">
                            {effectiveDur.toFixed(1)}s
                            {clip.speed !== 1 && <span className="ml-1">{clip.speed}x</span>}
                          </div>
                          {/* Fake waveform */}
                          {clip.has_audio && (
                            <div className="px-1 mt-1 flex items-end gap-px h-2">
                              {Array.from({ length: Math.max(Math.floor(w / 3), 4) }).map((_, i) => (
                                <div key={i} className="flex-1 rounded-t-sm bg-cyan/20"
                                  style={{ height: `${30 + Math.sin(i * 0.7) * 50 + Math.random() * 20}%` }} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Crossfade indicator */}
                        {idx < timelineClips.length - 1 && crossfade > 0 && (
                          <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full bg-cyan/20 border border-cyan/30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audio track indicator */}
              <div className="flex items-center gap-0.5">
                <div className="w-12 shrink-0 text-[8px] text-muted/50 font-mono text-right pr-1.5">A1</div>
                <div className="flex-1 flex gap-px overflow-x-auto">
                  {timelineClips.map((clip, idx) => {
                    const w = clipWidth(clip);
                    return (
                      <div key={`a_${clip.id}`} className="shrink-0 h-5 rounded" style={{
                        width: `${w}px`,
                        background: clip.has_audio ? "rgba(137,180,250,0.08)" : "rgba(255,255,255,0.02)",
                        borderTop: clip.has_audio ? "1px solid rgba(137,180,250,0.2)" : "1px solid rgba(255,255,255,0.05)",
                      }}>
                        {clip.has_audio && (
                          <div className="px-1 flex items-end gap-px h-full">
                            {Array.from({ length: Math.max(Math.floor(w / 4), 3) }).map((_, i) => (
                              <div key={i} className="flex-1 rounded-t-sm bg-cyan/15"
                                style={{ height: `${20 + Math.sin(i * 0.5) * 40 + Math.random() * 20}%` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Status Bar ───────────────────────────────────── */}
      <div className="h-7 border-t border-white/10 bg-bg flex items-center px-3 gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          {apiStatus === "connected" ? (
            <><Wifi size={10} className="text-green-400" /><span className="text-[10px] text-green-400/80">Connected</span></>
          ) : apiStatus === "disconnected" ? (
            <><WifiOff size={10} className="text-amber-400" /><span className="text-[10px] text-amber-400/80">Offline</span></>
          ) : (
            <><div className="w-2.5 h-2.5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" /><span className="text-[10px] text-muted">Connecting...</span></>
          )}
        </div>
        <div className="w-px h-3.5 bg-white/10" />
        <span className="text-[10px] text-muted">{composeClips.length} clips</span>
        <div className="w-px h-3.5 bg-white/10" />
        <span className="text-[10px] text-muted">{timelineClips.length} in timeline · {formatDuration(timelineDuration)}</span>
        {selectedClip && (
          <>
            <div className="w-px h-3.5 bg-white/10" />
            <span className="text-[10px] text-cyan font-medium">{selectedClip.shot_id}</span>
          </>
        )}
        <span className="ml-auto text-[9px] text-muted/50">? shortcuts</span>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function FilterPill({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button onClick={onClick} className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition flex items-center gap-1 ${
      active ? "bg-cyan/15 text-cyan" : "bg-white/5 text-muted hover:text-white"
    }`}>
      {color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <button onClick={onToggle} className={`relative h-5 w-9 rounded-full transition-colors ${active ? "bg-cyan" : "bg-white/15"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
      </button>
    </div>
  );
}

function SliderField({ label, value, min, max, step, suffix = "s", format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  suffix?: string; format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const display = format ? format(value) : `${value.toFixed(1)}${suffix}`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted">
        <span>{label}</span>
        <span className="font-mono text-cyan">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}
