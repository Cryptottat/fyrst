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
        "bg-bg-card arcade-border",
        paddingStyles[padding],
        hover && "group/card transition-all duration-100 hover:border-primary hover:shadow-[0_0_16px_rgba(167,139,250,0.25),0_0_32px_rgba(167,139,250,0.1)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
