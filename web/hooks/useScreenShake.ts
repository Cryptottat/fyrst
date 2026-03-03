"use client";

import { useCallback } from "react";

export function useScreenShake() {
  const shake = useCallback(() => {
    document.body.classList.add("animate-shake");
    setTimeout(() => {
      document.body.classList.remove("animate-shake");
    }, 200);
  }, []);

  return shake;
}
