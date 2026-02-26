"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

type CardPadding = "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: CardPadding;
  hover?: boolean;
}

const paddingStyles: Record<CardPadding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  padding = "md",
  hover = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-bg-card border border-border rounded-xl",
        paddingStyles[padding],
        hover &&
          "transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
