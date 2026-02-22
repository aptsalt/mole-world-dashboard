"use client";

import { useCallback, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const variantClasses = {
    danger: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
    warning: "bg-warning/20 text-warning border-warning/30 hover:bg-warning/30",
    default: "bg-cyan/20 text-cyan border-cyan/30 hover:bg-cyan/30",
  };

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 350 }}>
      <div
        className="modal-content p-6"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <div>
            <h3 id="confirm-title" className="text-sm font-semibold text-white">
              {title}
            </h3>
            <p id="confirm-message" className="mt-1 text-xs text-muted">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${variantClasses[confirmVariant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
