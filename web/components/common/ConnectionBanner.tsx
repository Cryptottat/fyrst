"use client";

import { useAppStore } from "@/lib/store";

export default function ConnectionBanner() {
  const wsConnected = useAppStore((s) => s.wsConnected);

  if (wsConnected) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-error/90 text-white text-center py-2 px-4">
      <p className="text-[10px] font-display tracking-wider animate-blink">
        CONNECTION LOST — RECONNECTING...
      </p>
    </div>
  );
}
