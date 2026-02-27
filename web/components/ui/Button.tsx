"use client";

import { cn } from "@/lib/utils";
import { useScreenShake } from "@/hooks/useScreenShake";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  noShake?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-bg arcade-border-primary arcade-btn font-display hover:brightness-110",
  secondary:
    "bg-secondary text-bg border-2 border-orange-400 arcade-btn font-display hover:brightness-110",
  outline:
    "bg-transparent arcade-border text-text-primary hover:border-primary hover:text-primary font-display",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[9px]",
  md: "px-5 py-2.5 text-[10px]",
  lg: "px-7 py-3 text-xs",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  noShake,
  onClick,
  ...props
}: ButtonProps) {
  const shake = useScreenShake();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!noShake) shake();
    onClick?.(e);
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
