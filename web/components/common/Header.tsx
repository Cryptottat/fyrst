"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "DASHBOARD", href: "/dashboard" },
  { label: "LAUNCH", href: "/launch" },
  { label: "PORTFOLIO", href: "/portfolio" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wsConnected = useAppStore((s) => s.wsConnected);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200",
        scrolled
          ? "bg-bg/95 backdrop-blur-sm border-b-2 border-border"
          : "bg-transparent",
      )}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo + WS status */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs font-display text-primary hover:text-primary/80 transition-colors neon-text-subtle"
          >
            FYRST
          </Link>
          {mounted && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                wsConnected
                  ? "bg-success animate-pulse"
                  : "bg-error",
              )}
              title={wsConnected ? "Live" : "Disconnected"}
            />
          )}
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[9px] font-display text-text-secondary hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <div className="hidden md:block">
          {mounted && (
            <WalletMultiButton
              style={{
                backgroundColor: "#A78BFA",
                color: "#0A0A0C",
                fontFamily: "'Press Start 2P', cursive",
                fontSize: "0.45rem",
                height: "2rem",
                borderRadius: "0",
                padding: "0 0.75rem",
                border: "2px solid #C4B5FD",
                boxShadow: "inset -2px -2px 0px rgba(0,0,0,0.4), inset 2px 2px 0px rgba(255,255,255,0.15)",
              }}
            />
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden bg-bg/95 backdrop-blur-sm border-b-2 border-border">
          <nav className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[9px] font-display text-text-secondary hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                &gt; {link.label}
              </Link>
            ))}
            {mounted && (
              <WalletMultiButton
                style={{
                  backgroundColor: "#A78BFA",
                  color: "#0A0A0C",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.45rem",
                  height: "2rem",
                  borderRadius: "0",
                  padding: "0 0.75rem",
                  border: "2px solid #C4B5FD",
                  width: "fit-content",
                }}
              />
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
