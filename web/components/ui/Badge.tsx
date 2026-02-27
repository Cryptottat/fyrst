"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = "reputation" | "collateral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const reputationColors: Record<string, string> = {
  A: "bg-success/15 text-success border-success/40",
  B: "bg-primary/15 text-primary border-primary/40",
  C: "bg-secondary/15 text-secondary border-secondary/40",
  D: "bg-warning/15 text-warning border-warning/40",
  F: "bg-error/15 text-error border-error/40",
};

const collateralColors: Record<string, string> = {
  Bronze: "bg-amber-700/15 text-amber-500 border-amber-700/40",
  Silver: "bg-zinc-400/15 text-zinc-300 border-zinc-400/40",
  Gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  Diamond: "bg-cyan-400/15 text-cyan-300 border-cyan-400/40",
};

export default function Badge({ label, variant = "reputation", className }: BadgeProps) {
  const colorMap = variant === "reputation" ? reputationColors : collateralColors;
  const colorClass = colorMap[label] || "bg-bg-elevated/50 text-text-secondary border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[9px] font-display border-2 neon-text-subtle",
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
