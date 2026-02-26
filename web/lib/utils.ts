/**
 * Format a number as a compact string (e.g., 1.2K, 3.4M).
 */
export function formatCompact(value: number): string {
  return Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

/**
 * Truncate a Solana address for display (e.g., "Ab3d...xY9z").
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
