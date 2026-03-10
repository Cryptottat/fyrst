"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import LandingOverlay from "@/components/landing/LandingOverlay";

const LandingGame = dynamic(
  () => import("@/components/landing/LandingGame"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-10 bg-[#87CEEB] flex items-center justify-center">
        <div className="text-[#1A2F1A]/60 font-mono text-sm animate-pulse">
          Loading...
        </div>
      </div>
    ),
  }
);

export default function GamePage() {
  const [scrollDepth, setScrollDepth] = useState(0);

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const depth = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
    setScrollDepth(depth);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <>
      <div style={{ height: "600vh" }} />

      <LandingGame scrollDepth={scrollDepth} />

      <LandingOverlay scrollDepth={scrollDepth} />

      {/* Scroll indicator */}
      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-center gap-1">
        <div
          className="w-0.5 h-16 rounded-full overflow-hidden"
          style={{ background: "rgba(126,200,227,0.1)" }}
        >
          <div
            className="w-full rounded-full transition-all duration-100"
            style={{
              height: `${scrollDepth * 100}%`,
              background:
                scrollDepth < 0.4
                  ? "#7EC8E3"
                  : scrollDepth < 0.65
                    ? "#E84855"
                    : "#D4A853",
            }}
          />
        </div>
        <span className="text-[8px] font-mono text-[#F5E6CA]/30">
          {Math.round(scrollDepth * 100)}%
        </span>
      </div>
    </>
  );
}
