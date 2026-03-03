use anchor_lang::prelude::*;

/// Escrow vault account storing deployer collateral
#[account]
#[derive(Default)]
pub struct EscrowVault {
    /// Deployer wallet address
    pub deployer: Pubkey,
    /// Token mint address
    pub token_mint: Pubkey,
    /// Collateral amount in lamports
    pub collateral_amount: u64,
    /// Timestamp when escrow was created
    pub created_at: i64,
    /// Deadline timestamp (created_at + duration_seconds)
    pub deadline_timestamp: i64,
    /// Whether the escrow has been released back to deployer
    pub released: bool,
    /// Bump seed for PDA
    pub bump: u8,
}

impl EscrowVault {
    pub const LEN: usize = 8  // discriminator
        + 32  // deployer
        + 32  // token_mint
        + 8   // collateral_amount
        + 8   // created_at
        + 8   // deadline_timestamp
        + 1   // released
        + 1;  // bump
}

/// Bonding curve state for a token
#[account]
#[derive(Default)]
pub struct BondingCurve {
    /// Token mint address
    pub token_mint: Pubkey,
    /// Current supply of tokens sold via the curve
    pub current_supply: u64,
    /// Base price in lamports
    pub base_price: u64,
    /// Price slope (price increase per token)
    pub slope: u64,
    /// Total SOL reserve in the curve
    pub reserve_balance: u64,
    /// Whether the token has graduated (hit bonding curve cap)
    pub graduated: bool,
    /// Deployer address
    pub deployer: Pubkey,
    /// Total SOL ever collected (for pro-rata refund denominator, never decreases)
    pub total_sol_collected: u64,
    /// High-water mark of reserve_balance (capped at GRADUATION_THRESHOLD)
    pub max_reserve_reached: u64,
    /// Total deployer fees accumulated (50% of trade fees)
    pub total_deployer_fees: u64,
    /// Deployer fees already claimed
    pub claimed_deployer_fees: u64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 8   // discriminator
        + 32  // token_mint
        + 8   // current_supply
        + 8   // base_price
        + 8   // slope
        + 8   // reserve_balance
        + 1   // graduated
        + 32  // deployer
        + 8   // total_sol_collected
        + 8   // max_reserve_reached
        + 8   // total_deployer_fees
        + 8   // claimed_deployer_fees
        + 1;  // bump
}

/// Protocol configuration (singleton PDA)
#[account]
#[derive(Default)]
pub struct ProtocolConfig {
    /// Protocol authority (admin operations)
    pub authority: Pubkey,
    /// Treasury wallet for protocol fee collection
    pub treasury: Pubkey,
    /// Graduation threshold in lamports
    pub graduation_threshold: u64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl ProtocolConfig {
    pub const LEN: usize = 8  // discriminator
        + 32  // authority
        + 32  // treasury
        + 8   // graduation_threshold
        + 1;  // bump
}

