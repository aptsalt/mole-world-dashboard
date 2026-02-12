"use client";

import { useState, useEffect } from "react";
import {
  Cog, Monitor, Cpu, HardDrive, Palette, Info,
  Film, Zap, Box, Code2, Bell, Eye, RefreshCw,
  Keyboard, Moon, Volume2, Shield, Download,
} from "lucide-react";
import { openShortcuts } from "@/components/ui/keyboard-shortcuts";

const PIPELINE_CONFIG = {
  output_dir: "C:\\Users\\deepc\\film-pipeline\\output",
  model: "WanVideo 2.1 (14B parameters)",
  resolution: "832x480",
  fps: 24,
  frames: 81,
  seed_strategy: "random",
  style_prefix: "cinematic composition, masterful cinematography, film grain, realistic lighting",
  v1_steps: 30,
  v2_steps: 40,
  v2_cfg_scale: 7.5,
};

const SYSTEM_INFO = [
  { label: "Platform", value: "Windows 11 + NVIDIA RTX 4090", icon: Monitor },
  { label: "GPU", value: "RTX 4090 \u00b7 16GB VRAM \u00b7 CUDA 12.x", icon: Cpu },
  { label: "Storage", value: "NVMe SSD \u00b7 ~92 MB pipeline output", icon: HardDrive },
  { label: "Dashboard", value: "v2.0.0 (Next.js 16.1)", icon: Code2 },
  { label: "AI Model", value: "WanVideo 2.1 via ComfyUI", icon: Box },
  { label: "Framework", value: "Next.js 16 + TypeScript + Tailwind v4", icon: Zap },
];

const COLORS = [
  { name: "Cyan", value: "#00d4ff", var: "--cyan" },
  { name: "Amber", value: "#ff6b35", var: "--amber" },
  { name: "Success", value: "#22c55e", var: "--success" },
  { name: "Warning", value: "#eab308", var: "--warning" },
  { name: "Error", value: "#ef4444", var: "--error" },
  { name: "Background", value: "#0f0f1a", var: "--bg" },
  { name: "Card", value: "#1a1a2e", var: "--bg-card" },
  { name: "Text", value: "#e2e8f0", var: "--text" },
  { name: "Muted", value: "#94a3b8", var: "--muted" },
];

interface Preferences {
  autoRefresh: boolean;
  autoRefreshInterval: number;
  notifications: boolean;
  soundEffects: boolean;
  animations: boolean;
  screensaver: boolean;
  screensaverDelay: number;
  compactMode: boolean;
  showConfetti: boolean;
}

const DEFAULT_PREFS: Preferences = {
  autoRefresh: true,
  autoRefreshInterval: 30,
  notifications: true,
  soundEffects: false,
  animations: true,
  screensaver: true,
  screensaverDelay: 300,
  compactMode: false,
  showConfetti: true,
};

function loadPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem("mw-preferences");
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: Preferences) {
  try {
    localStorage.setItem("mw-preferences", JSON.stringify(prefs));
  } catch {}
}

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
        active ? "bg-cyan" : "bg-white/[0.15]"
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          active ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SettingRow({ icon, label, description, children }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.03] transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-[11px] text-muted mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePrefs(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-muted mt-1">Pipeline configuration, preferences & system information</p>
      </div>

      {/* Preferences */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cog size={16} className="text-cyan" />
          <h3 className="text-sm font-semibold text-white">Preferences</h3>
        </div>
        <div className="space-y-1.5 stagger-list">
          <SettingRow
            icon={<RefreshCw size={14} className="text-cyan" />}
            label="Auto Refresh"
            description="Automatically refresh dashboard data"
          >
            <Toggle active={prefs.autoRefresh} onToggle={() => updatePref("autoRefresh", !prefs.autoRefresh)} />
          </SettingRow>

          {prefs.autoRefresh && (
            <div className="ml-[52px] mr-4 mb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">Interval</span>
                <span className="text-xs font-mono text-cyan">{prefs.autoRefreshInterval}s</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={prefs.autoRefreshInterval}
                onChange={(e) => updatePref("autoRefreshInterval", parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-muted mt-0.5">
                <span>10s</span>
                <span>120s</span>
              </div>
            </div>
          )}

          <SettingRow
            icon={<Bell size={14} className="text-amber" />}
            label="Notifications"
            description="Show desktop and in-app notifications"
          >
            <Toggle active={prefs.notifications} onToggle={() => updatePref("notifications", !prefs.notifications)} />
          </SettingRow>

          <SettingRow
            icon={<Volume2 size={14} className="text-success" />}
            label="Sound Effects"
            description="Play audio feedback on actions"
          >
            <Toggle active={prefs.soundEffects} onToggle={() => updatePref("soundEffects", !prefs.soundEffects)} />
          </SettingRow>

          <SettingRow
            icon={<Eye size={14} className="text-violet-400" />}
            label="Animations"
            description="Enable UI transitions and animations"
          >
            <Toggle active={prefs.animations} onToggle={() => updatePref("animations", !prefs.animations)} />
          </SettingRow>

          <SettingRow
            icon={<Moon size={14} className="text-blue-400" />}
            label="Screensaver"
            description="Starfield screensaver after inactivity"
          >
            <Toggle active={prefs.screensaver} onToggle={() => updatePref("screensaver", !prefs.screensaver)} />
          </SettingRow>

          {prefs.screensaver && (
            <div className="ml-[52px] mr-4 mb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">Delay</span>
                <span className="text-xs font-mono text-cyan">{Math.round(prefs.screensaverDelay / 60)}m</span>
              </div>
              <input
                type="range"
                min={60}
                max={900}
                step={60}
                value={prefs.screensaverDelay}
                onChange={(e) => updatePref("screensaverDelay", parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-muted mt-0.5">
                <span>1m</span>
                <span>15m</span>
              </div>
            </div>
          )}

          <SettingRow
            icon={<Zap size={14} className="text-warning" />}
            label="Confetti Celebrations"
            description="Show confetti on milestone completions"
          >
            <Toggle active={prefs.showConfetti} onToggle={() => updatePref("showConfetti", !prefs.showConfetti)} />
          </SettingRow>

          <SettingRow
            icon={<Shield size={14} className="text-muted" />}
            label="Compact Mode"
            description="Reduce spacing for information density"
          >
            <Toggle active={prefs.compactMode} onToggle={() => updatePref("compactMode", !prefs.compactMode)} />
          </SettingRow>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-amber" />
          <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            onClick={() => openShortcuts()}
            className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3.5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all text-left hover-lift"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10">
              <Keyboard size={14} className="text-cyan" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Keyboard Shortcuts</p>
              <p className="text-[10px] text-muted">Press ? to view</p>
            </div>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("mw-preferences");
              localStorage.removeItem("mw-quick-notes");
              setPrefs(DEFAULT_PREFS);
            }}
            className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3.5 hover:bg-error/[0.05] hover:border-error/20 transition-all text-left hover-lift"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-error/10">
              <Download size={14} className="text-error" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Reset All Data</p>
              <p className="text-[10px] text-muted">Clear local storage</p>
            </div>
          </button>
          <a
            href="http://127.0.0.1:8188"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3.5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all text-left hover-lift"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10">
              <Monitor size={14} className="text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Open ComfyUI</p>
              <p className="text-[10px] text-muted">127.0.0.1:8188</p>
            </div>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Configuration */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cog size={16} className="text-cyan" />
            <h3 className="text-sm font-semibold text-white">Pipeline Configuration</h3>
          </div>
          <div className="rounded-lg bg-black/40 p-4 font-mono text-xs leading-relaxed overflow-x-auto">
            {Object.entries(PIPELINE_CONFIG).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-cyan min-w-[140px]">{key}:</span>
                <span className="text-muted">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Information */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={16} className="text-cyan" />
            <h3 className="text-sm font-semibold text-white">System Information</h3>
          </div>
          <div className="space-y-3 stagger-list">
            {SYSTEM_INFO.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Icon size={14} className="text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-sm font-medium text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Design System */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} className="text-cyan" />
          <h3 className="text-sm font-semibold text-white">Design System \u2014 Deep Navy Theme</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {COLORS.map(({ name, value }) => (
            <div key={name} className="text-center group cursor-pointer">
              <div
                className="mx-auto h-12 w-12 rounded-lg border border-white/10 mb-2 transition-transform group-hover:scale-110 group-hover:shadow-lg"
                style={{ background: value }}
              />
              <p className="text-xs font-medium text-white">{name}</p>
              <p className="text-[10px] font-mono text-muted">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="glass p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-cyan" />
          <h3 className="text-sm font-semibold text-white">About</h3>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 border border-cyan/20">
            <Film size={20} className="text-cyan" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">The Mole World \u2014 Production Suite</p>
            <p className="text-xs text-muted mt-1">
              Real-time monitoring dashboard for an AI-generated animated short film.
              Built with WanVideo 2.1 (14B), ComfyUI, Flask, and Next.js.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Next.js 16", "TypeScript", "Tailwind v4", "Zustand", "Recharts", "WanVideo 2.1", "ComfyUI", "RTX 4090"].map((tech) => (
                <span key={tech} className="badge bg-white/[0.06] text-muted border border-white/[0.08]">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
