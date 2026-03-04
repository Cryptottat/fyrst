"use client";

import { useEffect, useRef } from "react";
import Button from "./Button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  rows: { label: string; value: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  rows,
  confirmLabel = "CONFIRM",
  cancelLabel = "CANCEL",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onCancel(); }}
    >
      <div className="bg-bg-card arcade-border p-6 w-full max-w-sm mx-4 space-y-4">
        <h3 className="text-[10px] font-display text-primary tracking-wider">
          {title}
        </h3>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[9px] font-display text-text-muted tracking-wider">
                {row.label}
              </span>
              <span className="text-[10px] font-mono text-text-primary">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
