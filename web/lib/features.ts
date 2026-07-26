// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

/**
 * Section gates. NEXT_PUBLIC_* values are inlined at build time, so flipping a
 * flag requires a redeploy. Default is closed — a section only opens when the
 * value is explicitly "true".
 */
export const FEATURES = {
  floor: process.env.NEXT_PUBLIC_FEATURE_FLOOR === "true",
  launch: process.env.NEXT_PUBLIC_FEATURE_LAUNCH === "true",
  bounty: process.env.NEXT_PUBLIC_FEATURE_BOUNTY === "true",
} as const;
