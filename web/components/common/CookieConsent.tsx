"use client";

import { useState, useEffect, useCallback } from "react";

const COOKIE_KEY = "hedg_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem(COOKIE_KEY, "1");
    setVisible(false);

    // Unlock AudioContext for browser autoplay policy
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    ctx.resume().then(() => ctx.close());

    // Trigger silent audio to fully unlock media playback
    const a = document.createElement("audio");
    a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    a.play().catch(() => {});

    // Dispatch event so other components know consent was given
    window.dispatchEvent(new Event("cookie-consent"));
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/40" />

      {/* Cookie banner — full-width bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto"
        style={{
          background: "#111115",
          borderTop: "2px solid #2A2A30",
          boxShadow: "0 -4px 60px rgba(0,0,0,0.9)",
        }}
      >
        <div className="max-w-5xl mx-auto px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="font-display text-base md:text-lg tracking-wide mb-3" style={{ color: "#F5E6CA" }}>
                WE USE COOKIES
              </p>
              <p className="font-mono text-sm leading-relaxed" style={{ color: "#9E9EA8" }}>
                We use cookies and similar technologies to enhance your browsing experience,
                analyze site traffic, and personalize content. By clicking &quot;Accept All&quot;,
                you consent to our use of cookies as described in our Cookie Policy.
                You can manage your preferences at any time.
              </p>
              <p className="font-mono text-xs mt-3" style={{ color: "#55555F" }}>
                This includes essential cookies for site functionality and optional analytics cookies.
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={accept}
                className="w-full md:w-48 py-4 font-display text-sm tracking-wide cursor-pointer transition-transform"
                style={{
                  background: "#D4A853",
                  color: "#0A0A0C",
                  border: "2px solid #D4A853",
                  boxShadow: "inset -3px -3px 0px #8B6914, inset 3px 3px 0px rgba(245,230,202,0.4)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                ACCEPT ALL
              </button>
              <button
                onClick={accept}
                className="w-full md:w-48 py-3 font-display text-xs tracking-wide cursor-pointer"
                style={{
                  background: "transparent",
                  color: "#888891",
                  border: "1px solid #2A2A30",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#888891"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A30"; }}
              >
                ESSENTIAL ONLY
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
