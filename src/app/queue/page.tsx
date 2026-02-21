"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ListOrdered, Loader2, AlertCircle } from "lucide-react";
import type { QueueEditorItem, ParsedMdShot, CameraConfig } from "@/lib/types";
import { QueueToolbar } from "@/components/queue/queue-toolbar";
import { QueueAccordionItem } from "@/components/queue/queue-accordion-item";
import { MdImportPanel } from "@/components/queue/md-import-panel";
import { getQueueItems } from "@/lib/api";

const DEFAULT_CAMERA: CameraConfig = {
  sensor: "ARRI Alexa 35",
  lens: "Anamorphic",
  focalLength: "35mm",
  aperture: "f/2.8",
  movement: "Static",
  genre: "Cinematic",
};

function parsedShotToQueueItem(shot: ParsedMdShot): QueueEditorItem {
  return {
    shotId: shot.shotId,
    sceneId: shot.shotId.replace(/_\d+$/, ""),
    partNumber: parseInt(shot.shotId.match(/P(\d+)/)?.[1] || "1", 10),
    status: "pending",
    prompt: shot.imagePrompt,
    motionPrompt: shot.motionPrompt,
    camera: shot.camera,
    imageModel: "nano-banana-pro",
    videoModels: shot.models,
    videoModel: shot.finalModel,
    durationSec: shot.durationSec,
    startFramePath: "",
    endFramePath: "",
    requiresCredits: false,
    imageQuality: null,
    videoQuality: null,
    imageAttempts: 0,
    videoAttempts: 0,
    outputImagePath: null,
    outputVideoPath: null,
    error: null,
    startedAt: null,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueEditorItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef<string>("");

  // Load queue on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQueueItems();
        if (Array.isArray(data)) {
          const normalized = data.map((item: Record<string, unknown>): QueueEditorItem => ({
            shotId: (item.shotId as string) || "",
            sceneId: (item.sceneId as string) || "",
            partNumber: (item.partNumber as number) || 1,
            status: (item.status as QueueEditorItem["status"]) || "pending",
            prompt: (item.prompt as string) || "",
            motionPrompt: (item.motionPrompt as string) || "",
            camera: (item.camera as CameraConfig) || { ...DEFAULT_CAMERA },
            imageModel: (item.imageModel as string) || "nano-banana-pro",
            videoModels: Array.isArray(item.videoModels)
              ? (item.videoModels as string[])
              : [(item.videoModel as string) || "minimax-hailuo-2.3-fast"],
            videoModel: (item.videoModel as string) || "wan-2.5",
            durationSec: (item.durationSec as number) || 10,
            startFramePath: (item.startFramePath as string) || "",
            endFramePath: (item.endFramePath as string) || "",
            requiresCredits: (item.requiresCredits as boolean) || false,
            imageQuality: (item.imageQuality as QueueEditorItem["imageQuality"]) || null,
            videoQuality: (item.videoQuality as QueueEditorItem["videoQuality"]) || null,
            imageAttempts: (item.imageAttempts as number) || 0,
            videoAttempts: (item.videoAttempts as number) || 0,
            outputImagePath: (item.outputImagePath as string) || null,
            outputVideoPath: (item.outputVideoPath as string) || null,
            error: (item.error as string) || null,
            startedAt: (item.startedAt as string) || null,
            completedAt: (item.completedAt as string) || null,
            updatedAt: (item.updatedAt as string) || new Date().toISOString(),
          }));
          setItems(normalized);
          savedRef.current = JSON.stringify(normalized);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load queue");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Track dirty state
  useEffect(() => {
    setIsDirty(JSON.stringify(items) !== savedRef.current);
  }, [items]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      savedRef.current = JSON.stringify(items);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [items]);

  const handleImport = useCallback(
    (shots: ParsedMdShot[], mode: "append" | "replace") => {
      const newItems = shots.map(parsedShotToQueueItem);
      if (mode === "replace") {
        setItems(newItems);
      } else {
        const existingIds = new Set(items.map((i) => i.shotId));
        const unique = newItems.filter((i) => !existingIds.has(i.shotId));
        setItems([...items, ...unique]);
      }
    },
    [items],
  );

  const handleItemChange = useCallback(
    (index: number, updated: QueueEditorItem) => {
      setItems((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
    },
    [],
  );

  const handleDelete = useCallback(
    (index: number) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
      setExpandedId(null);
    },
    [],
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      setItems((prev) => {
        const source = prev[index];
        const sceneId = source.sceneId;
        const sceneItems = prev.filter((i) => i.sceneId === sceneId);
        const maxNum = sceneItems.reduce((max, i) => {
          const num = parseInt(i.shotId.split("_").pop() || "0", 10);
          return Math.max(max, num);
        }, 0);
        const newNum = String(maxNum + 1).padStart(3, "0");
        const newShotId = `${sceneId}_${newNum}`;

        const duplicate: QueueEditorItem = {
          ...source,
          shotId: newShotId,
          status: "pending",
          imageQuality: null,
          videoQuality: null,
          outputImagePath: null,
          outputVideoPath: null,
          error: null,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date().toISOString(),
        };

        const next = [...prev];
        next.splice(index + 1, 0, duplicate);
        return next;
      });
    },
    [],
  );

  const handleClear = useCallback(() => {
    if (items.length === 0) return;
    setItems([]);
    setExpandedId(null);
  }, [items.length]);

  const handleSelectAll = useCallback(() => {
    // Collapse any expanded item (deselect all)
    setExpandedId(null);
  }, []);

  // Filtered items
  const filtered = items.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.shotId.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q) ||
        item.sceneId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-cyan" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
          <ListOrdered size={20} className="text-cyan" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Queue Editor</h1>
          <p className="text-xs text-muted">Compose shot data for batch video generation</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">dismiss</button>
        </div>
      )}

      {/* MD Import */}
      <MdImportPanel onImport={handleImport} />

      {/* Toolbar */}
      <QueueToolbar
        items={items}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        isDirty={isDirty}
        onSave={handleSave}
        onClear={handleClear}
        onSelectAll={handleSelectAll}
        saving={saving}
      />

      {/* Shot list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ListOrdered size={40} className="text-white/10 mb-4" />
          <p className="text-sm text-muted">
            {items.length === 0 ? "No shots in queue. Import from markdown to get started." : "No shots match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const realIndex = items.findIndex((i) => i.shotId === item.shotId);
            return (
              <QueueAccordionItem
                key={item.shotId}
                item={item}
                isExpanded={expandedId === item.shotId}
                onToggle={() => setExpandedId(expandedId === item.shotId ? null : item.shotId)}
                onChange={(updated) => handleItemChange(realIndex, updated)}
                onDelete={() => handleDelete(realIndex)}
                onDuplicate={() => handleDuplicate(realIndex)}
              />
            );
          })}
        </div>
      )}

      {/* Dirty state indicator */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-amber/20 bg-[#101020]/95 px-4 py-3 text-xs text-amber shadow-lg backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-amber animate-pulse" />
          Unsaved changes
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-2 rounded-lg bg-cyan/10 border border-cyan/20 px-3 py-1 text-cyan hover:bg-cyan/20 transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
