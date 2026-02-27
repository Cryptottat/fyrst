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
  { name: "Bronze", amount: 1, label: "1 SOL" },
  { name: "Silver", amount: 5, label: "5 SOL" },
  { name: "Gold", amount: 10, label: "10 SOL" },
  { name: "Diamond", amount: 25, label: "25+ SOL" },
] as const;

/** Minimum collateral in SOL required to launch a token */
export const MIN_COLLATERAL = 1;

/** Safe period duration in seconds (24 hours) */
export const SAFE_PERIOD = 24 * 60 * 60;

/** Protocol fee as a decimal (0.5%) */
export const PROTOCOL_FEE = 0.005;

/** Trade fee as a decimal (1%) */
export const TRADE_FEE = 0.01;
