"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "ABOUT", href: "/about" },
  { label: "$HEDG", href: "/hedg-token" },
  { label: "FLOOR", href: "/floor" },
  { label: "LAUNCH", href: "/launch" },
  { label: "BOUNTY", href: "/bounty" },
  { label: "PORTFOLIO", href: "/portfolio" },
];

const onChainLinks = [
  { label: "BUYBACK LOG", href: "/on-chain/buyback" },
  { label: "ESCROW CLAIMS", href: "/on-chain/claims" },
];

const linkStyle = { color: "#F5E6CA", textShadow: "0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)" };

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [onChainOpen, setOnChainOpen] = useState(false);
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
        "fixed top-0 left-0 right-0 z-[60] transition-all duration-300 pointer-events-auto",
        scrolled
          ? "bg-bg/95 backdrop-blur-md border-b border-border"
          : "bg-transparent",
      )}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo + WS status */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm font-display transition-colors"
            style={{ color: "#F5E6CA", textShadow: "0 0 6px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)" }}
          >
            HEDG
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
        <nav className="hidden md:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-display transition-colors hover:!text-[#D4A853]"
              style={linkStyle}
            >
              {link.label}
            </Link>
          ))}

          {/* ON-CHAIN dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setOnChainOpen(true)}
            onMouseLeave={() => setOnChainOpen(false)}
          >
            <button
              className="text-xs font-display transition-colors hover:!text-[#D4A853] cursor-pointer"
              style={linkStyle}
            >
              ON-CHAIN
            </button>
            {onChainOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 pt-2"
              >
                <div
                  className="min-w-[160px] py-2 border border-border"
                  style={{ background: "rgba(17,17,21,0.97)", backdropFilter: "blur(12px)" }}
                >
                  {onChainLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2.5 text-[9px] font-display transition-colors hover:bg-bg-hover hover:!text-[#D4A853]"
                      style={{ color: "#F5E6CA" }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Social + Wallet */}
        <div className="hidden md:flex items-center gap-5">
          <a
            href="https://x.com/hedglol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-[#D4A853] transition-colors"
            aria-label="X (Twitter)"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://github.com/hedg-lol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-[#D4A853] transition-colors"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          {mounted && (
            <WalletMultiButton
              style={{
                backgroundColor: "#D4A853",
                color: "#0A0A0C",
                fontFamily: "'Press Start 2P', cursive",
                fontSize: "0.45rem",
                height: "2rem",
                borderRadius: "0",
                padding: "0 0.75rem",
                border: "2px solid #F5E6CA",
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
        <div className="md:hidden bg-bg/95 backdrop-blur-md border-b border-border">
          <nav className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-display transition-colors hover:!text-[#D4A853]"
                style={{ color: "#F5E6CA" }}
                onClick={() => setMobileOpen(false)}
              >
                &gt; {link.label}
              </Link>
            ))}
            <p className="text-[8px] font-display text-text-muted mt-2">ON-CHAIN</p>
            {onChainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-display transition-colors hover:!text-[#D4A853] pl-3"
                style={{ color: "#F5E6CA" }}
                onClick={() => setMobileOpen(false)}
              >
                &gt; {link.label}
              </Link>
            ))}
            {mounted && (
              <WalletMultiButton
                style={{
                  backgroundColor: "#D4A853",
                  color: "#0A0A0C",
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: "0.45rem",
                  height: "2rem",
                  borderRadius: "0",
                  padding: "0 0.75rem",
                  border: "2px solid #F5E6CA",
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
