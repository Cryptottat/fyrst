"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = "reputation" | "collateral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const reputationColors: Record<string, string> = {
  A: "bg-success/15 text-success border-success/30",
  B: "bg-primary/15 text-primary border-primary/30",
  C: "bg-secondary/15 text-secondary border-secondary/30",
  D: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  F: "bg-error/15 text-error border-error/30",
};

const collateralColors: Record<string, string> = {
  Bronze: "bg-amber-800/15 text-amber-600 border-amber-800/30",
  Silver: "bg-gray-400/15 text-gray-300 border-gray-400/30",
  Gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Diamond: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
};

export default function Badge({ label, variant = "reputation", className }: BadgeProps) {
  const colorMap = variant === "reputation" ? reputationColors : collateralColors;
  const colorClass = colorMap[label] || "bg-bg-elevated/50 text-text-secondary border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border font-mono",
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
