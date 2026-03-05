/// Minimum collateral in lamports (0.1 SOL)
pub const MIN_COLLATERAL: u64 = 100_000_000;

/// Minimum escrow duration in seconds (1 minute — devnet testing)
pub const MIN_DURATION: i64 = 60;

/// Maximum escrow duration in seconds (7 days)
pub const MAX_DURATION: i64 = 604_800;

/// Protocol fee in basis points (0% — folded into trade fee split)
pub const PROTOCOL_FEE_BPS: u64 = 0;

/// Trade fee in basis points (1% = 100 bps, split 50/50: deployer + treasury)
pub const TRADE_FEE_BPS: u64 = 100;

/// Deployer fee share in basis points (50 = 0.5% of trade volume)
pub const DEPLOYER_FEE_BPS: u64 = 50;

/// Deploy fee in lamports (0.02 SOL)
pub const DEPLOY_FEE: u64 = 20_000_000;

/// Escrow PDA seed
pub const ESCROW_SEED: &[u8] = b"escrow";

/// Bonding curve PDA seed
pub const CURVE_SEED: &[u8] = b"curve";

/// Basis points denominator
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Protocol config PDA seed
pub const PROTOCOL_SEED: &[u8] = b"protocol";

/// Graduation threshold in lamports (5 SOL — devnet testing)
pub const GRADUATION_THRESHOLD: u64 = 5_000_000_000;

/// Token decimals for SPL tokens
pub const TOKEN_DECIMALS: u8 = 6;

/// Initial virtual token reserves (pump.fun style, TOKEN_DECIMALS=6)
pub const INITIAL_VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_000_000_000;

/// Initial virtual SOL reserves in lamports (30 SOL)
pub const INITIAL_VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000;

/// Initial real token reserves (tokens available for bonding curve sale)
pub const INITIAL_REAL_TOKEN_RESERVES: u64 = 793_100_000_000_000;

/// Total token supply (1 billion with 6 decimals)
pub const TOKEN_TOTAL_SUPPLY: u64 = 1_000_000_000_000_000;

/// Wrapped SOL mint address
pub const WSOL_MINT: &str = "So11111111111111111111111111111111111111112";

/// Raydium CPMM program IDs
pub const RAYDIUM_CPMM_MAINNET: &str = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
pub const RAYDIUM_CPMM_DEVNET: &str = "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb";
