"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  className,
  showLabel = true,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-[9px] font-display text-text-muted">HP</span>
          <span className="text-xs font-score text-text-secondary neon-text-subtle">
            {clamped}/100
          </span>
        </div>
      )}
      <div className="w-full h-3 bg-bg-elevated arcade-border overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${clamped}%`,
            background:
              clamped > 60
                ? "linear-gradient(90deg, #34D399, #6EE7B7)"
                : clamped > 30
                  ? "linear-gradient(90deg, #FBBF24, #FCD34D)"
                  : "linear-gradient(90deg, #F87171, #FCA5A5)",
            boxShadow:
              clamped > 60
                ? "0 0 8px rgba(52, 211, 153, 0.4)"
                : clamped > 30
                  ? "0 0 8px rgba(251, 191, 36, 0.4)"
                  : "0 0 8px rgba(248, 113, 113, 0.4)",
          }}
        />
      </div>
    </div>
  );
}
