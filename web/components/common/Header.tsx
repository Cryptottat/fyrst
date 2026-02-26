"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Launch", href: "/launch" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-bg/80 backdrop-blur-xl border-b border-border/50"
          : "bg-transparent",
      )}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-extrabold text-text-primary tracking-tight hover:text-primary transition-colors"
        >
          FYRST
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:block">
          <Button variant="outline" size="sm">
            Connect Wallet
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden bg-bg/95 backdrop-blur-xl border-b border-border">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button variant="outline" size="sm" className="w-fit">
              Connect Wallet
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
