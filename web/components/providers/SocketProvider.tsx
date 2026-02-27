"use client";

import type { ReactNode } from "react";
import { useSocketInit } from "@/hooks/useSocket";

export default function SocketProvider({ children }: { children: ReactNode }) {
  useSocketInit();
  return <>{children}</>;
}
