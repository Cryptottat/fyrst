use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;

use instructions::*;

declare_id!("7HRkCWJt4DXZ2tfomHZufdS6j97RdHiLZHbdnY4mensH");

#[program]
pub mod fyrst {
    use super::*;

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

    /// Initialize bonding curve for a token
    pub fn init_bonding_curve(
        ctx: Context<InitBondingCurve>,
        base_price: u64,
        slope: u64,
    ) -> Result<()> {
        instructions::bonding_curve::init_bonding_curve(ctx, base_price, slope)
    }

    /// Buy tokens on the bonding curve
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
    ) -> Result<()> {
        instructions::bonding_curve::buy_tokens(ctx, sol_amount)
    }

    /// Sell tokens on the bonding curve
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

    /// Process refund for a buyer (called by protocol authority)
    pub fn process_refund(ctx: Context<ProcessRefund>) -> Result<()> {
        instructions::refund::process_refund(ctx)
    }
}
