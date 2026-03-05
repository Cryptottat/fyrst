// ---------------------------------------------------------------------------
// FYRST Project Constants
// ---------------------------------------------------------------------------

/** Design system color tokens — Midnight Studio palette */
export const COLORS = {
  bg: "#0C0C0F",
  bgCard: "#141417",
  bgElevated: "#1C1C21",
  bgHover: "#232329",
  primary: "#A78BFA",
  secondary: "#FB923C",
  accent: "#34D399",
  success: "#34D399",
  error: "#F87171",
  warning: "#FBBF24",
  textPrimary: "#EDEDEF",
  textSecondary: "#8B8B96",
  textMuted: "#52525B",
  border: "#27272A",
  borderHover: "#3F3F46",
} as const;

/** Holder tier definitions */
export const TIERS = [
  {
    name: "Free",
    requiredAmount: 0,
    benefits: ["Basic token browsing", "Public reputation scores"],
  },
  {
    name: "Basic",
    requiredAmount: 100,
    benefits: ["Early launch alerts", "Basic analytics"],
  },
  {
    name: "Pro",
    requiredAmount: 1_000,
    benefits: ["Advanced analytics", "Priority refund queue", "Deployer deep-dive"],
  },
  {
    name: "Elite",
    requiredAmount: 10_000,
    benefits: ["Real-time whale tracking", "Custom alerts", "Governance voting"],
  },
  {
    name: "Whale",
    requiredAmount: 100_000,
    benefits: [
      "All Elite benefits",
      "Private deployer audits",
      "Direct team channel access",
    ],
  },
] as const;

/** Collateral tier definitions */
export const COLLATERAL_TIERS = [
  { name: "Iron", amount: 0.01, label: "0.01 SOL" },
  { name: "Bronze", amount: 0.5, label: "0.5 SOL" },
  { name: "Silver", amount: 1, label: "1 SOL" },
  { name: "Gold", amount: 3, label: "3 SOL" },
  { name: "Platinum", amount: 5, label: "5 SOL" },
  { name: "Diamond", amount: 10, label: "10 SOL" },
] as const;

/** Minimum collateral in SOL required to launch a token */
export const MIN_COLLATERAL = 0.01;

/** Deadline duration presets (seconds) */
export const DEADLINE_PRESETS = [
  { label: "1 MIN", seconds: 60 },
  { label: "3 MIN", seconds: 180 },
  { label: "5 MIN", seconds: 300 },
  { label: "15 MIN", seconds: 900 },
  { label: "30 MIN", seconds: 1_800 },
  { label: "1 HOUR", seconds: 3_600 },
  { label: "6 HOURS", seconds: 21_600 },
  { label: "12 HOURS", seconds: 43_200 },
  { label: "24 HOURS", seconds: 86_400 },
  { label: "3 DAYS", seconds: 259_200 },
  { label: "7 DAYS", seconds: 604_800 },
] as const;

/** Protocol fee as a decimal (0% — folded into 1% trade fee split) */
export const PROTOCOL_FEE = 0;

/** Trade fee as a decimal (1%) */
export const TRADE_FEE = 0.01;
