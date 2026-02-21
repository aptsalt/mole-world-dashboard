"use client";

import { Search, Save, Trash2, CheckSquare, Filter } from "lucide-react";
import type { QueueEditorItem } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
  skipped: "Skipped",
};

interface QueueToolbarProps {
  items: QueueEditorItem[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  isDirty: boolean;
  onSave: () => void;
  onClear: () => void;
  onSelectAll: () => void;
  saving: boolean;
}

export function QueueToolbar({
  items,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isDirty,
  onSave,
  onClear,
  onSelectAll,
  saving,
}: QueueToolbarProps) {
  const total = items.length;
  const pending = items.filter((i) => i.status === "pending").length;
  const completed = items.filter((i) => i.status === "completed").length;
  const failed = items.filter((i) => i.status === "failed").length;

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-[#101020]/90 px-4 py-3 backdrop-blur-md">
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono text-white">{total} shots</span>
        <span className="text-muted">|</span>
        <span className="text-cyan">{pending} pending</span>
        <span className="text-success">{completed} done</span>
        {failed > 0 && <span className="text-red-400">{failed} failed</span>}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search shots..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-44 rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan/30"
        />
      </div>

      {/* Status filter */}
      <div className="relative flex items-center gap-1.5">
        <Filter size={13} className="text-muted" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-8 appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 pr-6 text-xs text-white outline-none cursor-pointer"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <CheckSquare size={13} />
          Select All
        </button>

        <button
          onClick={onClear}
          disabled={total === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 disabled:opacity-40"
        >
          <Trash2 size={13} />
          Clear
        </button>

        <button
          onClick={onSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-1.5 rounded-lg border border-cyan/20 bg-cyan/10 px-4 py-1.5 text-xs font-medium text-cyan transition-all hover:bg-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={13} />
          {saving ? "Saving..." : "Save to Disk"}
          {isDirty && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
