"use client";

import { useState, useCallback, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import type { QueueEditorItem, CameraConfig } from "@/lib/types";

const SENSOR_OPTIONS = ["ARRI Alexa 35", "RED V-Raptor", "Sony Venice 2", "Blackmagic URSA Mini"];
const LENS_OPTIONS = ["Anamorphic", "Spherical", "Macro", "Tilt-Shift"];
const MOVEMENT_OPTIONS = [
  "Static", "Dolly Forward", "Dolly Back", "Tracking Left", "Tracking Right",
  "Crane Up", "Crane Down", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down",
  "Handheld", "Orbit", "Push In", "Pull Out",
];
const GENRE_OPTIONS = ["Cinematic", "Suspense", "Action", "Drama", "Horror", "Documentary", "Sci-Fi"];
const IMAGE_MODEL_OPTIONS = [
  "flux-2-pro", "higgsfield-soul", "kling-o1", "nano-banana-pro", "seedream-4.5",
];
const VIDEO_MODEL_OPTIONS = [
  "minimax-hailuo-2.3-fast", "seedance-1.5-pro", "kling-2.5-turbo", "wan-2.5", "sora-2-queue",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-white/20",
  completed: "bg-success",
  failed: "bg-red-400",
  skipped: "bg-white/20",
  generating_image: "bg-cyan",
  generating_video: "bg-purple-400",
};

interface QueueAccordionItemProps {
  item: QueueEditorItem;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updated: QueueEditorItem) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function QueueAccordionItem({
  item,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
}: QueueAccordionItemProps) {
  const [draggingStart, setDraggingStart] = useState(false);
  const [draggingEnd, setDraggingEnd] = useState(false);

  const updateField = useCallback(
    <K extends keyof QueueEditorItem>(key: K, value: QueueEditorItem[K]) => {
      onChange({ ...item, [key]: value, updatedAt: new Date().toISOString() });
    },
    [item, onChange],
  );

  const updateCamera = useCallback(
    <K extends keyof CameraConfig>(key: K, value: CameraConfig[K]) => {
      onChange({
        ...item,
        camera: { ...item.camera, [key]: value },
        updatedAt: new Date().toISOString(),
      });
    },
    [item, onChange],
  );

  const toggleVideoModel = useCallback(
    (model: string) => {
      const next = item.videoModels.includes(model)
        ? item.videoModels.filter((m) => m !== model)
        : [...item.videoModels, model];
      updateField("videoModels", next);
    },
    [item.videoModels, updateField],
  );

  const handleFrameDrop = useCallback(
    async (e: DragEvent, field: "startFramePath" | "endFramePath") => {
      e.preventDefault();
      field === "startFramePath" ? setDraggingStart(false) : setDraggingEnd(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("shotId", item.shotId);

      try {
        const res = await fetch("/api/queue/upload-frame", { method: "POST", body: formData });
        const data = await res.json();
        if (data.ok) {
          updateField(field, data.path);
        }
      } catch {
        // Upload failed silently
      }
    },
    [item.shotId, updateField],
  );

  const statusDot = STATUS_COLORS[item.status] || "bg-white/20";
  const promptPreview = item.prompt.slice(0, 60) + (item.prompt.length > 60 ? "..." : "");

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/[0.1]">
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
        <span className="shrink-0 rounded bg-cyan/10 px-2 py-0.5 font-mono text-[11px] font-medium text-cyan">
          {item.shotId}
        </span>
        <span className="flex-1 truncate text-xs text-muted">{promptPreview || "No prompt"}</span>
        <div className="flex shrink-0 items-center gap-2">
          {item.videoModels.slice(0, 2).map((model) => (
            <span
              key={model}
              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50"
            >
              {model.split("-").pop()}
            </span>
          ))}
          {item.videoModels.length > 2 && (
            <span className="text-[10px] text-white/30">+{item.videoModels.length - 2}</span>
          )}
          <span className="text-[10px] text-white/30 font-mono">{item.durationSec}s</span>
          {isExpanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
        </div>
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">Shot ID</label>
                <input
                  type="text"
                  value={item.shotId}
                  readOnly
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-white/50 font-mono outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">Image Prompt</label>
                <textarea
                  value={item.prompt}
                  onChange={(e) => updateField("prompt", e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan/30 resize-y"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">Motion Prompt</label>
                <textarea
                  value={item.motionPrompt}
                  onChange={(e) => updateField("motionPrompt", e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan/30 resize-y"
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Sensor" value={item.camera.sensor} options={SENSOR_OPTIONS} onChange={(v) => updateCamera("sensor", v)} />
                <SelectField label="Lens" value={item.camera.lens} options={LENS_OPTIONS} onChange={(v) => updateCamera("lens", v)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">Focal Length</label>
                  <input
                    type="text"
                    value={item.camera.focalLength}
                    onChange={(e) => updateCamera("focalLength", e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none focus:border-cyan/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">Aperture</label>
                  <input
                    type="text"
                    value={item.camera.aperture}
                    onChange={(e) => updateCamera("aperture", e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none focus:border-cyan/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">Duration</label>
                  <input
                    type="number"
                    value={item.durationSec}
                    onChange={(e) => updateField("durationSec", parseInt(e.target.value, 10) || 5)}
                    min={1}
                    max={60}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none focus:border-cyan/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Movement" value={item.camera.movement} options={MOVEMENT_OPTIONS} onChange={(v) => updateCamera("movement", v)} />
                <SelectField label="Genre" value={item.camera.genre} options={GENRE_OPTIONS} onChange={(v) => updateCamera("genre", v)} />
              </div>

              <SelectField
                label="Image Model"
                value={item.imageModel}
                options={IMAGE_MODEL_OPTIONS}
                onChange={(v) => updateField("imageModel", v)}
              />

              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted uppercase tracking-wider">Video Models</label>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_MODEL_OPTIONS.map((model) => {
                    const active = item.videoModels.includes(model);
                    return (
                      <button
                        key={model}
                        onClick={() => toggleVideoModel(model)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                          active
                            ? "border-cyan/30 bg-cyan/10 text-cyan"
                            : "border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.15] hover:text-white"
                        }`}
                      >
                        {model.split("-").slice(-2).join(" ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Frame inputs */}
          <div className="grid grid-cols-2 gap-4">
            <FrameInput
              label="Start Frame"
              value={item.startFramePath}
              onChange={(v) => updateField("startFramePath", v)}
              onDrop={(e) => handleFrameDrop(e, "startFramePath")}
              dragging={draggingStart}
              onDragEnter={() => setDraggingStart(true)}
              onDragLeave={() => setDraggingStart(false)}
            />
            <FrameInput
              label="End Frame (optional)"
              value={item.endFramePath}
              onChange={(v) => updateField("endFramePath", v)}
              onDrop={(e) => handleFrameDrop(e, "endFramePath")}
              dragging={draggingEnd}
              onDragEnter={() => setDraggingEnd(true)}
              onDragLeave={() => setDraggingEnd(false)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            <button
              onClick={onDuplicate}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Copy size={12} />
              Duplicate
            </button>
            <div className="flex-1" />
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={12} />
              Delete Shot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-cyan/30"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        {!options.includes(value) && value && (
          <option value={value}>{value}</option>
        )}
      </select>
    </div>
  );
}

function FrameInput({
  label,
  value,
  onChange,
  onDrop,
  dragging,
  onDragEnter,
  onDragLeave,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDrop: (e: DragEvent) => void;
  dragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
}) {
  const hasImage = value && (value.endsWith(".png") || value.endsWith(".jpg") || value.endsWith(".webp"));

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted uppercase tracking-wider">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); onDragEnter(); }}
        onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
        onDragLeave={onDragLeave}
        onDrop={onDrop as unknown as React.DragEventHandler}
        className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
          dragging ? "border-cyan/40 bg-cyan/5" : "border-white/[0.08] bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Drag image or paste path..."
            className="flex-1 rounded border-0 bg-transparent text-xs text-white placeholder:text-white/30 outline-none"
          />
          {value && (
            <button onClick={() => onChange("")} className="text-muted hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {!value && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/30">
            <Upload size={12} />
            Drop image here
          </div>
        )}

        {hasImage && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
            <ImageIcon size={14} className="text-cyan" />
            <span className="truncate text-[11px] text-muted">{value.split(/[\\/]/).pop()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
