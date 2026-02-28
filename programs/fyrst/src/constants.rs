/// Minimum collateral in lamports (0.01 SOL = 10_000_000 lamports)
pub const MIN_COLLATERAL: u64 = 10_000_000;

/// Safe period in seconds (24 hours)
pub const SAFE_PERIOD: i64 = 24 * 60 * 60;

/// Protocol fee in basis points (0.5% = 50 bps)
pub const PROTOCOL_FEE_BPS: u64 = 50;

/// Trade fee in basis points (1% = 100 bps)
pub const TRADE_FEE_BPS: u64 = 100;

/// Deploy fee in lamports (0.02 SOL)
pub const DEPLOY_FEE: u64 = 20_000_000;

/// Escrow PDA seed
pub const ESCROW_SEED: &[u8] = b"escrow";

/// Bonding curve PDA seed
pub const CURVE_SEED: &[u8] = b"curve";

/// Buyer record PDA seed
pub const BUYER_SEED: &[u8] = b"record";

/// Basis points denominator
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Protocol config PDA seed
pub const PROTOCOL_SEED: &[u8] = b"protocol";

/// Graduation threshold in lamports (85 SOL — pump.fun model)
pub const GRADUATION_THRESHOLD: u64 = 85_000_000_000;

/// Token decimals for SPL tokens
pub const TOKEN_DECIMALS: u8 = 6;
