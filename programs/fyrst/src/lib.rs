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

    /// Initialize escrow vault with deployer collateral and custom deadline
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        collateral_amount: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        instructions::escrow::create_escrow(ctx, collateral_amount, duration_seconds)
    }

    /// Release escrow back to deployer (requires token graduation)
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
        min_tokens_out: u64,
    ) -> Result<()> {
        instructions::bonding_curve::buy_tokens(ctx, sol_amount, min_tokens_out)
    }

    /// Sell tokens on the bonding curve (burns SPL tokens)
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        token_amount: u64,
        min_sol_out: u64,
    ) -> Result<()> {
        instructions::bonding_curve::sell_tokens(ctx, token_amount, min_sol_out)
    }

    /// Process burn-to-refund for a buyer (permissionless — buyer claims own refund)
    pub fn process_refund(ctx: Context<ProcessRefund>) -> Result<()> {
        instructions::refund::process_refund(ctx)
    }

    /// Update protocol treasury (authority only)
    pub fn update_treasury(
        ctx: Context<UpdateTreasury>,
        new_treasury: Pubkey,
    ) -> Result<()> {
        instructions::protocol::update_treasury(ctx, new_treasury)
    }

    /// Claim accumulated trade fees (deployer only)
    pub fn claim_fees(ctx: Context<ClaimFees>) -> Result<()> {
        instructions::protocol::claim_fees(ctx)
    }

    /// Graduate a bonding curve when reserve meets threshold
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        instructions::protocol::graduate(ctx)
    }
}
