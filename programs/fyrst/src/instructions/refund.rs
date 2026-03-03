use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};
use crate::state::{EscrowVault, BondingCurve};
use crate::errors::FyrstError;
use crate::constants::*;

/// Process burn-to-refund: buyer burns their SPL tokens and receives
/// a pro-rata share of the escrow lamports.
///
/// refund = (buyer_tokens / current_supply) × escrow_remaining_lamports
///
/// Conditions: token NOT graduated AND deadline passed AND buyer holds tokens.
pub fn process_refund(ctx: Context<ProcessRefund>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_vault;
    let curve = &mut ctx.accounts.bonding_curve;
    let buyer_balance = ctx.accounts.buyer_token_account.amount;

    // Must not be graduated AND deadline must have passed
    let now = Clock::get()?.unix_timestamp;
    require!(
        !curve.graduated && now >= escrow.deadline_timestamp,
        FyrstError::DeadlineNotReached
    );
    require!(buyer_balance > 0, FyrstError::InsufficientTokens);

    // refund = (buyer_tokens / current_supply) × escrow remaining lamports
    let escrow_lamports = ctx.accounts.escrow_vault.to_account_info().lamports();
    let refund_amount = (buyer_balance as u128)
        .checked_mul(escrow_lamports as u128)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(curve.current_supply as u128)
        .ok_or(FyrstError::MathOverflow)? as u64;

    require!(refund_amount > 0, FyrstError::InsufficientFunds);

    // Burn buyer's SPL tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        buyer_balance,
    )?;

    // Transfer SOL from escrow to buyer
    **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? += refund_amount;

    // Update bonding curve supply (so next refund has correct ratio)
    curve.current_supply = curve
        .current_supply
        .checked_sub(buyer_balance)
        .ok_or(FyrstError::MathOverflow)?;

    msg!(
        "Refund: buyer={}, tokens_burned={}, sol_refunded={}",
        ctx.accounts.buyer.key(),
        buyer_balance,
        refund_amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ProcessRefund<'info> {
    /// Buyer claiming their own refund (permissionless)
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow_vault.deployer.as_ref(), escrow_vault.token_mint.as_ref()],
        bump = escrow_vault.bump,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(
        mut,
        seeds = [CURVE_SEED, escrow_vault.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(mut, address = bonding_curve.token_mint)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
