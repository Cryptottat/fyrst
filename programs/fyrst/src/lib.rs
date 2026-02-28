use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;

use instructions::*;

declare_id!("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");

#[program]
pub mod fyrst {
    use super::*;

    /// Initialize protocol configuration (one-time setup)
    pub fn init_protocol(
        ctx: Context<InitProtocol>,
        treasury: Pubkey,
    ) -> Result<()> {
        instructions::protocol::init_protocol(ctx, treasury)
    }

    /// Initialize escrow vault for a deployer's token launch
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        collateral_amount: u64,
    ) -> Result<()> {
        instructions::escrow::create_escrow(ctx, collateral_amount)
    }

    /// Release escrow after safe period (deployer reclaims)
    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        instructions::escrow::release_escrow(ctx)
    }

    /// Initialize bonding curve with SPL token mint + metadata
    pub fn init_bonding_curve(
        ctx: Context<InitBondingCurve>,
        base_price: u64,
        slope: u64,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::bonding_curve::init_bonding_curve(ctx, base_price, slope, name, symbol, uri)
    }

    /// Buy tokens on the bonding curve (mints SPL tokens)
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
    ) -> Result<()> {
        instructions::bonding_curve::buy_tokens(ctx, sol_amount)
    }

    /// Sell tokens on the bonding curve (burns SPL tokens)
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        token_amount: u64,
    ) -> Result<()> {
        instructions::bonding_curve::sell_tokens(ctx, token_amount)
    }

    /// Record a buyer for refund eligibility tracking
    pub fn record_buyer(
        ctx: Context<RecordBuyer>,
        amount: u64,
        price: u64,
    ) -> Result<()> {
        instructions::refund::record_buyer(ctx, amount, price)
    }

    /// Process pro-rata refund for a buyer (called by protocol authority)
    pub fn process_refund(ctx: Context<ProcessRefund>) -> Result<()> {
        instructions::refund::process_refund(ctx)
    }

    /// Mark a token as rugged (authority only)
    pub fn mark_rugged(ctx: Context<MarkRugged>) -> Result<()> {
        instructions::protocol::mark_rugged(ctx)
    }

    /// Graduate a bonding curve when reserve meets threshold
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        instructions::protocol::graduate(ctx)
    }
}
