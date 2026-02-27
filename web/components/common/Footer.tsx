"use client";

import Link from "next/link";

const footerLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Launch", href: "/launch" },
  { label: "Docs", href: "#" },
];

const socialLinks = [
  { label: "X", href: "https://x.com/fyrstprotocol" },
  { label: "GitHub", href: "https://github.com/fyrst-protocol" },
  { label: "Telegram", href: "https://t.me/fyrstprotocol" },
];

export default function Footer() {
  return (
    <footer className="border-t-2 border-border bg-bg-card/30">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="text-xs font-display text-primary neon-text-subtle">
              FYRST
            </Link>
            <p className="text-xs text-text-muted mt-3 max-w-xs leading-relaxed font-mono">
              <span className="text-primary">&gt; </span>
              The Anti-Casino. Fair launches on Solana.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[8px] font-display text-text-secondary mb-4 tracking-wider">
              NAV
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-text-muted hover:text-primary transition-colors font-mono"
                  >
                    &gt; {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-[8px] font-display text-text-secondary mb-4 tracking-wider">
              LINKS
            </h4>
            <ul className="space-y-2">
              {socialLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-muted hover:text-primary transition-colors font-mono"
                  >
                    &gt; {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t-2 border-border pt-6 flex items-center justify-between">
          <p className="text-[8px] font-display text-text-muted">
            &copy; {new Date().getFullYear()} FYRST PROTOCOL
          </p>
          <p className="text-[8px] font-display text-text-muted animate-blink">
            INSERT COIN TO CONTINUE
          </p>
        </div>
      </div>
    </footer>
  );
}
