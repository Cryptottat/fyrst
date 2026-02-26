import clsx, { type ClassValue } from "clsx";

/**
 * Merge class names with clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format a number as a compact string (e.g., 1.2K, 3.4M).
 */
export function formatCompact(value: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

/**
 * Format a SOL amount with up to 4 decimal places.
 */
export function formatSol(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M SOL`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K SOL`;
  }
  return `${amount.toFixed(amount < 1 ? 4 : 2)} SOL`;
}

/**
 * Truncate a Solana address for display (e.g., "Ab3d...xY9z").
 */
export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Keep the old name as an alias
export const truncateAddress = formatAddress;

/**
 * Return a human-readable relative time string.
 */
export function formatTimeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Get the letter grade for a reputation score (0-100).
 */
export function getReputationGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Get the collateral tier name from a SOL amount.
 */
export function getCollateralTier(amount: number): string {
  if (amount >= 25) return "Diamond";
  if (amount >= 10) return "Gold";
  if (amount >= 5) return "Silver";
  return "Bronze";
}
