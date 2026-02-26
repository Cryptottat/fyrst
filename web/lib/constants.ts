// ---------------------------------------------------------------------------
// FYRST Project Constants
// ---------------------------------------------------------------------------

/** Design system color tokens */
export const COLORS = {
  bg: "#0F172A",
  bgCard: "#1E293B",
  bgElevated: "#334155",
  primary: "#2563EB",
  secondary: "#D97706",
  accent: "#059669",
  success: "#10B981",
  error: "#DC2626",
  warning: "#D97706",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#475569",
  border: "#334155",
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
