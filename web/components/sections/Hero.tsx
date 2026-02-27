"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useScreenShake } from "@/hooks/useScreenShake";

function ScrambleText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`";

  useEffect(() => {
    let i = 0;
    setDisplayed("");
    setDone(false);

    const interval = setInterval(() => {
      if (i < text.length) {
        const resolved = text.slice(0, i);
        const scrambled = text[i] === " " ? " " : chars[Math.floor(Math.random() * chars.length)];
        setDisplayed(resolved + scrambled);
        i++;
      } else {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-blink text-primary">_</span>}
    </span>
  );
}

export default function Hero() {
  const [showMenu, setShowMenu] = useState(false);
  const shake = useScreenShake();

  useEffect(() => {
    const timer = setTimeout(() => setShowMenu(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleButtonClick = useCallback(() => {
    shake();
  }, [shake]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Arcade grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(167, 139, 250, 0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167, 139, 250, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow behind mascot */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        {/* Buster mascot */}
        <div className="mb-6 flex justify-center">
          <div className="animate-arcade-bob">
            <Image
              src="/images/buster-hero.png"
              alt="Buster - The Arcade Guardian"
              width={180}
              height={180}
              data-pixel=""
              className="drop-shadow-[0_0_20px_rgba(167,139,250,0.4)]"
              style={{ imageRendering: "pixelated" }}
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-3xl font-display text-text-primary tracking-tight mb-2 leading-relaxed">
          <span className="text-primary neon-text">FYRST</span>
        </h1>
        <p className="text-[10px] md:text-xs font-display text-secondary neon-text-subtle mb-8 tracking-widest">
          THE ANTI-CASINO
        </p>

        {/* Arcade terminal dialogue */}
        <div className="arcade-border bg-bg-card/90 p-5 md:p-6 text-left mb-8 max-w-lg mx-auto backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-border/50 pb-2">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-[8px] font-display text-text-muted tracking-wider">BUSTER_TERMINAL v1.0</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed font-mono">
            <span className="text-primary">&gt; </span>
            <ScrambleText
              text="Welcome to the Arcade. No rugs, no casino BS. Just pure gameplay. Insert SOL to start."
              speed={25}
            />
          </p>
        </div>

        {/* Arcade menu buttons */}
        {showMenu && (
          <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
            <Link href="/launch" className="w-full animate-slide-in" onClick={handleButtonClick}>
              <div className="arcade-border bg-secondary/10 border-secondary px-6 py-3.5 flex items-center justify-center gap-3 hover:bg-secondary/20 hover:shadow-[0_0_16px_rgba(251,146,60,0.3)] transition-all cursor-pointer group w-full">
                <span className="text-[10px] font-display text-secondary animate-blink">[ </span>
                <span className="text-[10px] font-display text-secondary neon-text-subtle">INSERT COIN (LAUNCH)</span>
                <span className="text-[10px] font-display text-secondary animate-blink"> ]</span>
              </div>
            </Link>
            <Link href="/dashboard" className="w-full opacity-0 animate-slide-in" style={{ animationDelay: "0.1s" }} onClick={handleButtonClick}>
              <div className="arcade-border bg-primary/5 border-primary/60 px-6 py-3.5 flex items-center justify-center gap-3 hover:bg-primary/10 hover:shadow-[0_0_16px_rgba(167,139,250,0.3)] transition-all cursor-pointer group w-full">
                <span className="text-[10px] font-display text-primary">[ </span>
                <span className="text-[10px] font-display text-primary neon-text-subtle">SELECT PLAYER (BROWSE)</span>
                <span className="text-[10px] font-display text-primary"> ]</span>
              </div>
            </Link>
          </div>
        )}

        {/* Press start blink */}
        {!showMenu && (
          <p className="text-[9px] font-display text-text-muted animate-blink mt-6">
            LOADING...
          </p>
        )}
      </div>
    </section>
  );
}
