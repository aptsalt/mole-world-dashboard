"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bookmark,
  Plus,
  Trash2,
  Play,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { getTemplates, saveTemplate, deleteTemplate, useTemplate } from "@/lib/api";
import { useToastStore } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  pipeline: string;
  prompt: string;
  imageModelAlias?: string;
  videoModelAlias?: string;
  voiceKey?: string;
  narrationMode?: string;
  bgmPresetKey?: string;
  bgmVolume?: number;
  createdAt: string;
  useCount: number;
}

interface TemplateGalleryProps {
  /** Called when user selects a template to use */
  onUseTemplate: (template: Template) => void;
  /** Current form values for "Save as Template" */
  currentValues?: Partial<Template>;
}

const CATEGORIES = ["all", "educational", "entertainment", "news", "general"];

export function TemplateGallery({ onUseTemplate, currentValues }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveCategory, setSaveCategory] = useState("general");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filtered = category === "all"
    ? templates
    : templates.filter((t) => t.category === category);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    await saveTemplate({
      name: saveName,
      description: saveDesc,
      category: saveCategory,
      ...currentValues,
    });
    addToast("success", `Template "${saveName}" saved`);
    setSaveName("");
    setSaveDesc("");
    setShowSaveForm(false);
    fetchTemplates();
  };

  const handleUse = async (template: Template) => {
    await useTemplate(template.id);
    onUseTemplate(template);
    addToast("info", `Loaded template: ${template.name}`);
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTemplate(deleteId);
    addToast("success", "Template deleted");
    setDeleteId(null);
    fetchTemplates();
  };

  return (
    <div className="glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bookmark size={14} className="text-amber" />
          <h3 className="text-sm font-semibold text-white">Templates</h3>
          <span className="text-[10px] text-muted">({templates.length})</span>
        </div>
        <button
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="flex items-center gap-1 rounded-lg bg-cyan/10 px-2 py-1 text-[10px] font-medium text-cyan hover:bg-cyan/20 transition-colors"
        >
          <Plus size={10} />
          Save Current
        </button>
      </div>

      {/* Save Form */}
      {showSaveForm && (
        <div className="border-b border-white/[0.06] p-3 space-y-2">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Template name..."
            className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-white placeholder:text-muted outline-none focus:border-cyan/30"
          />
          <input
            value={saveDesc}
            onChange={(e) => setSaveDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs text-white placeholder:text-muted outline-none focus:border-cyan/30"
          />
          <div className="flex items-center gap-2">
            <select
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value)}
              className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-[10px] text-muted outline-none"
            >
              {CATEGORIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="rounded-lg bg-cyan/20 border border-cyan/30 px-3 py-1 text-[10px] font-medium text-cyan hover:bg-cyan/30 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveForm(false)}
              className="text-[10px] text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={clsx(
              "rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors whitespace-nowrap",
              category === cat ? "bg-cyan/10 text-cyan" : "text-muted hover:text-white"
            )}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            {cat === "all" && ` (${templates.length})`}
          </button>
        ))}
      </div>

      {/* Template List */}
      <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-8">
            <Sparkles size={20} className="text-white/10 mx-auto mb-2 empty-state-icon" />
            <p className="text-xs text-muted">No templates yet</p>
            <p className="text-[10px] text-white/20 mt-0.5">Save your current form as a template</p>
          </div>
        )}
        {filtered.map((template) => (
          <div
            key={template.id}
            className="group rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-white truncate">{template.name}</p>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[8px] text-muted">
                    {template.type}
                  </span>
                  <span className="rounded-full bg-cyan/10 px-1.5 py-0.5 text-[8px] text-cyan">
                    {template.category}
                  </span>
                </div>
                {template.description && (
                  <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{template.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[9px] text-white/20">
                  {template.voiceKey && <span>Voice: {template.voiceKey}</span>}
                  {template.imageModelAlias && <span>Model: {template.imageModelAlias}</span>}
                  <span>Used {template.useCount}x</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleUse(template)}
                  className="rounded p-1 text-muted hover:text-cyan hover:bg-cyan/10 transition-colors"
                  title="Use template"
                >
                  <Play size={12} />
                </button>
                <button
                  onClick={() => setDeleteId(template.id)}
                  className="rounded p-1 text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {/* Prompt preview */}
            <div className="mt-2 rounded bg-white/[0.03] px-2 py-1.5">
              <p className="text-[10px] font-mono text-muted line-clamp-2">{template.prompt}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Template?"
        message="This template will be permanently deleted."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
