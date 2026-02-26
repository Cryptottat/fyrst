"use client";

import Link from "next/link";

const footerLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Launch", href: "/launch" },
  { label: "Docs", href: "#" },
];

const socialLinks = [
  { label: "Twitter", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "Telegram", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-card/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-extrabold text-text-primary">
              FYRST
            </Link>
            <p className="text-sm text-text-muted mt-2 max-w-xs">
              The first accountable token launchpad on Solana. Launch safe. Buy
              confident.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-4">
              Navigation
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-semibold text-text-secondary mb-4">
              Community
            </h4>
            <ul className="space-y-2">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-xs text-text-muted text-center">
            &copy; {new Date().getFullYear()} FYRST Protocol. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
