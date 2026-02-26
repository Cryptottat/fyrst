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
          <span className="text-xs text-text-muted">Bonding Curve</span>
          <span className="text-xs font-mono text-text-secondary">
            {clamped}%
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, #2563EB, #059669)`,
          }}
        />
      </div>
    </div>
  );
}
