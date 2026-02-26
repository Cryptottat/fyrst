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
    /// Whether the escrow has been released back to deployer
    pub released: bool,
    /// Whether a rug was detected (triggers refund mode)
    pub rugged: bool,
    /// Bump seed for PDA
    pub bump: u8,
}

impl EscrowVault {
    pub const LEN: usize = 8  // discriminator
        + 32  // deployer
        + 32  // token_mint
        + 8   // collateral_amount
        + 8   // created_at
        + 1   // released
        + 1   // rugged
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
    /// Bump seed for PDA
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 8  // discriminator
        + 32  // token_mint
        + 8   // current_supply
        + 8   // base_price
        + 8   // slope
        + 8   // reserve_balance
        + 1   // graduated
        + 32  // deployer
        + 1;  // bump
}

/// Buyer record for refund eligibility
#[account]
#[derive(Default)]
pub struct BuyerRecord {
    /// Buyer wallet address
    pub buyer: Pubkey,
    /// Token mint address
    pub token_mint: Pubkey,
    /// Total tokens bought
    pub total_bought: u64,
    /// Total SOL spent
    pub total_sol_spent: u64,
    /// Average buy price in lamports
    pub avg_price: u64,
    /// Whether refund has been claimed
    pub refund_claimed: bool,
    /// Timestamp of first purchase
    pub first_buy_at: i64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl BuyerRecord {
    pub const LEN: usize = 8  // discriminator
        + 32  // buyer
        + 32  // token_mint
        + 8   // total_bought
        + 8   // total_sol_spent
        + 8   // avg_price
        + 1   // refund_claimed
        + 8   // first_buy_at
        + 1;  // bump
}
