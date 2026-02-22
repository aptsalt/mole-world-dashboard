"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Palette,
  Gauge,
  Wifi,
  Info,
  Check,
  RefreshCw,
  Terminal,
  Film,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useToastStore } from "@/components/ui/toast";
import { resetOnboarding } from "@/components/ui/onboarding";

// ── Theme definitions (sourced from globals.css [data-theme=...]) ──

const THEMES = [
  {
    id: "dark",
    label: "Cool Navy",
    description: "Default dashboard theme",
    swatches: {
      bg: "#1f2435",
      card: "#313a52",
      cyan: "#7dd3fc",
      accent: "#a5b4fc",
      amber: "#fcd34d",
      text: "#dce4f8",
      muted: "#a0aed0",
    },
  },
  {
    id: "slate",
    label: "Warm Slate",
    description: "Higgsfield production palette",
    swatches: {
      bg: "#2b2d3e",
      card: "#3a3d52",
      cyan: "#89b4fa",
      accent: "#b4befe",
      amber: "#fab387",
      text: "#e2e5f0",
      muted: "#b0b5cc",
    },
  },
  {
    id: "charcoal",
    label: "Soft Charcoal",
    description: "Distribution hub palette",
    swatches: {
      bg: "#2e3045",
      card: "#43465e",
      cyan: "#c4b5fd",
      accent: "#f0abfc",
      amber: "#fbbf24",
      text: "#e8eaf4",
      muted: "#b8bdd4",
    },
  },
  {
    id: "light",
    label: "Light Mode",
    description: "Clean light appearance",
    swatches: {
      bg: "#f8fafc",
      card: "#ffffff",
      cyan: "#0284c7",
      accent: "#6366f1",
      amber: "#d97706",
      text: "#1e293b",
      muted: "#475569",
    },
  },
] as const;

// ── Refresh interval options ─────────────────────────────────

const REFRESH_OPTIONS = [
  { label: "5s", ms: 5000 },
  { label: "10s", ms: 10000 },
  { label: "15s", ms: 15000 },
  { label: "30s", ms: 30000 },
  { label: "60s", ms: 60000 },
] as const;

// ── API health-check endpoints ───────────────────────────────

const ENDPOINTS = [
  { label: "Pipeline API", url: "/api/pipeline/api/status" },
  { label: "Automation", url: "/api/automation/status" },
  { label: "Orchestrate", url: "/api/orchestrate/status" },
  { label: "Voices", url: "/api/voices" },
] as const;

type EndpointStatus = "unknown" | "checking" | "ok" | "error";

// ── CLI commands (mirrors production page) ───────────────────

const CLI_COMMANDS = [
  { cmd: "npx tsx src/index.ts start", desc: "Start automation (opens browser)" },
  { cmd: "npx tsx src/index.ts start --headless", desc: "Run headless overnight" },
  { cmd: "npx tsx src/index.ts status", desc: "Check current status" },
  { cmd: "npx tsx src/index.ts queue-add --all", desc: "Load 89 shots into queue" },
  { cmd: "npm run batch-video:dry", desc: "Preview batch video plan" },
  { cmd: "npm run batch-video", desc: "Generate 3 videos per shot (Hailuo, Kling, Seedance)" },
];

// ── Main settings page ───────────────────────────────────────

export default function SettingsPage() {
  const { preferences, setTheme, setRefreshInterval } = useDashboardStore();
  const { addToast } = useToastStore();
  const [endpointStatuses, setEndpointStatuses] = useState<Record<string, EndpointStatus>>(() => {
    const init: Record<string, EndpointStatus> = {};
    for (const ep of ENDPOINTS) init[ep.url] = "unknown";
    return init;
  });
  const [checking, setChecking] = useState(false);

  // Apply theme to DOM when the user picks one
  const handleThemeChange = useCallback(
    (themeId: string) => {
      setTheme(themeId);
      document.documentElement.setAttribute("data-theme", themeId);
    },
    [setTheme],
  );

  // Health-check all endpoints
  const checkEndpoints = useCallback(async () => {
    setChecking(true);
    const next: Record<string, EndpointStatus> = {};
    for (const ep of ENDPOINTS) next[ep.url] = "checking";
    setEndpointStatuses({ ...next });

    await Promise.all(
      ENDPOINTS.map(async (ep) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(ep.url, {
            method: "HEAD",
            signal: controller.signal,
            cache: "no-store",
          });
          clearTimeout(timer);
          setEndpointStatuses((prev) => ({ ...prev, [ep.url]: res.ok ? "ok" : "error" }));
        } catch {
          setEndpointStatuses((prev) => ({ ...prev, [ep.url]: "error" }));
        }
      }),
    );
    setChecking(false);
  }, []);

  // Run health-check on mount
  useEffect(() => {
    checkEndpoints();
  }, [checkEndpoints]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
          <Settings size={20} className="text-cyan" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">Settings</h1>
          <p className="text-xs text-muted">Appearance, data preferences & service health</p>
        </div>
      </div>

      {/* ── 1. Appearance ────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-cyan" />
          <h2 className="text-sm font-semibold text-text">Appearance</h2>
        </div>
        <p className="text-xs text-muted mb-3">Choose a colour theme for the dashboard.</p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => {
            const active = preferences.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`relative rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-cyan/40 bg-cyan/[0.06] shadow-[0_0_12px_rgba(125,211,252,0.08)]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]"
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan">
                    <Check size={12} className="text-bg" />
                  </div>
                )}

                {/* Swatch strip */}
                <div className="flex gap-1.5 mb-2">
                  {Object.entries(t.swatches).map(([name, color]) => (
                    <div
                      key={name}
                      className="h-5 w-5 rounded-md border border-white/10"
                      style={{ background: color }}
                      title={name}
                    />
                  ))}
                </div>

                <p className="text-sm font-medium text-text">{t.label}</p>
                <p className="text-[11px] text-muted mt-0.5">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Data & Performance ────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={16} className="text-cyan" />
          <h2 className="text-sm font-semibold text-text">Data & Performance</h2>
        </div>
        <p className="text-xs text-muted mb-3">
          How often the dashboard polls backend services for fresh data.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {REFRESH_OPTIONS.map((opt) => {
            const active = preferences.refreshInterval === opt.ms;
            return (
              <button
                key={opt.ms}
                onClick={() => setRefreshInterval(opt.ms)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-cyan/40 bg-cyan/10 text-cyan"
                    : "border-white/[0.08] bg-white/[0.02] text-muted hover:text-white hover:border-white/[0.16]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-muted">
          Current interval:{" "}
          <span className="font-mono text-cyan">{preferences.refreshInterval / 1000}s</span>
        </p>

        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="text-xs text-muted mb-2">Cached thumbnails speed up gallery loading but use disk space.</p>
          <button
            onClick={async () => {
              await fetch("/api/thumbnails/clear", { method: "POST" });
              addToast("success", "Thumbnail cache cleared");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-colors"
          >
            <Trash2 size={12} />
            Clear Thumbnail Cache
          </button>
        </div>
      </div>

      {/* ── 3. API Status ────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-cyan" />
            <h2 className="text-sm font-semibold text-text">API Status</h2>
          </div>
          <button
            onClick={checkEndpoints}
            disabled={checking}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted hover:text-white hover:border-white/[0.12] transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={checking ? "animate-spin" : ""} />
            Re-check
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {ENDPOINTS.map((ep) => {
            const s = endpointStatuses[ep.url];
            return (
              <div
                key={ep.url}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                {/* Indicator */}
                {s === "checking" && <Loader2 size={14} className="animate-spin text-muted" />}
                {s === "ok" && (
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-success/20">
                    <span className="h-2 w-2 rounded-full bg-success" />
                  </span>
                )}
                {s === "error" && (
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-error/20">
                    <span className="h-2 w-2 rounded-full bg-error" />
                  </span>
                )}
                {s === "unknown" && (
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text">{ep.label}</p>
                  <p className="text-[10px] font-mono text-muted truncate">{ep.url}</p>
                </div>

                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    s === "ok"
                      ? "text-success"
                      : s === "error"
                        ? "text-error"
                        : "text-muted"
                  }`}
                >
                  {s === "checking" ? "..." : s === "ok" ? "Reachable" : s === "error" ? "Offline" : "Pending"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. About ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-cyan" />
          <h2 className="text-sm font-semibold text-text">About</h2>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 border border-cyan/20">
            <Film size={20} className="text-cyan" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Mole World Dashboard</p>
            <p className="text-xs text-muted mt-0.5">Version 2.0</p>
            <p className="text-xs text-muted mt-1">
              Real-time monitoring dashboard for an AI-generated animated short film.
              Built with WanVideo 2.1 (14B), ComfyUI, Flask, and Next.js 16.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Next.js 16", "TypeScript", "Tailwind v4", "Zustand", "Recharts", "WanVideo 2.1", "ComfyUI", "RTX 4090"].map((tech) => (
                <span key={tech} className="badge bg-white/[0.06] text-muted border border-white/[0.08]">
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <button
                onClick={resetOnboarding}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted hover:text-white hover:border-white/[0.12] transition-colors"
              >
                <Sparkles size={12} />
                Restart Tour
              </button>
            </div>
          </div>
        </div>

        {/* CLI Commands */}
        <div className="border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={14} className="text-cyan" />
            <h3 className="text-xs font-semibold text-text">Automation CLI Commands</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CLI_COMMANDS.map(({ cmd, desc }) => (
              <div key={cmd} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                <code className="block font-mono text-[10px] text-cyan">{cmd}</code>
                <p className="mt-0.5 text-[10px] text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
