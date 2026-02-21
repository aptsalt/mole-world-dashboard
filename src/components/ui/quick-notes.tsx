"use client";

import { useState, useEffect, useRef } from "react";
import { StickyNote, Plus, X, Trash2, GripVertical } from "lucide-react";

interface Note {
  id: string;
  text: string;
  color: string;
  createdAt: number;
}

const NOTE_COLORS = [
  "rgba(137,180,250,0.08)",
  "rgba(255,107,53,0.08)",
  "rgba(34,197,94,0.08)",
  "rgba(139,92,246,0.08)",
  "rgba(234,179,8,0.08)",
];

const BORDER_COLORS = [
  "rgba(137,180,250,0.2)",
  "rgba(255,107,53,0.2)",
  "rgba(34,197,94,0.2)",
  "rgba(139,92,246,0.2)",
  "rgba(234,179,8,0.2)",
];

const STORAGE_KEY = "mw-quick-notes";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

export function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const addNote = () => {
    if (!newText.trim()) return;
    const colorIndex = notes.length % NOTE_COLORS.length;
    const note: Note = {
      id: Math.random().toString(36).slice(2),
      text: newText.trim(),
      color: NOTE_COLORS[colorIndex],
      createdAt: Date.now(),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setNewText("");
    setIsAdding(false);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewText("");
    }
  };

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote size={14} className="text-warning" />
        <h3 className="text-sm font-semibold text-white">Quick Notes</h3>
        <span className="text-[10px] text-muted">{notes.length} notes</span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="ml-auto flex items-center gap-1 text-[10px] text-muted hover:text-cyan transition-colors"
        >
          {isAdding ? <X size={12} /> : <Plus size={12} />}
          {isAdding ? "Cancel" : "Add"}
        </button>
      </div>

      {isAdding && (
        <div className="mb-3 animate-slide-up">
          <textarea
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a note... (Enter to save, Shift+Enter for new line)"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white outline-none placeholder:text-muted resize-none focus:border-cyan/30 transition-colors"
            rows={2}
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={addNote}
              disabled={!newText.trim()}
              className="rounded-lg bg-cyan/10 border border-cyan/20 px-3 py-1.5 text-[11px] font-medium text-cyan hover:bg-cyan/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[260px] overflow-y-auto">
        {notes.map((note, i) => {
          const borderColor = BORDER_COLORS[i % BORDER_COLORS.length];
          return (
            <div
              key={note.id}
              className="note-card group flex items-start gap-2 rounded-lg px-3 py-2.5 border transition-all hover:bg-white/[0.02]"
              style={{ background: note.color, borderColor }}
            >
              <GripVertical size={10} className="text-white/10 mt-1 shrink-0" />
              <p className="text-xs text-white/80 leading-relaxed flex-1 whitespace-pre-wrap">
                {note.text}
              </p>
              <button
                onClick={() => deleteNote(note.id)}
                className="shrink-0 text-white/10 hover:text-error opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
        {notes.length === 0 && !isAdding && (
          <p className="text-center text-[11px] text-muted py-4">
            No notes yet. Click + to add one.
          </p>
        )}
      </div>
    </div>
  );
}
