use anchor_lang::prelude::*;
use crate::state::{BuyerRecord, EscrowVault};
use crate::errors::FyrstError;
use crate::constants::*;

/// Record a buyer's purchase for refund eligibility
pub fn record_buyer(ctx: Context<RecordBuyer>, amount: u64, price: u64) -> Result<()> {
    let record = &mut ctx.accounts.buyer_record;

    if record.total_bought == 0 {
        // First purchase
        record.buyer = ctx.accounts.buyer.key();
        record.token_mint = ctx.accounts.token_mint.key();
        record.first_buy_at = Clock::get()?.unix_timestamp;
        record.refund_claimed = false;
        record.bump = ctx.bumps.buyer_record;
    }

    // Update totals
    let sol_spent = amount
        .checked_mul(price)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(FyrstError::MathOverflow)?;

    record.total_bought = record
        .total_bought
        .checked_add(amount)
        .ok_or(FyrstError::MathOverflow)?;

    record.total_sol_spent = record
        .total_sol_spent
        .checked_add(sol_spent)
        .ok_or(FyrstError::MathOverflow)?;

    // Recalculate average price
    if record.total_bought > 0 {
        record.avg_price = record
            .total_sol_spent
            .checked_mul(1_000_000_000)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(record.total_bought)
            .ok_or(FyrstError::MathOverflow)?;
    }

    msg!(
        "Buyer recorded: buyer={}, mint={}, amount={}, total={}",
        record.buyer,
        record.token_mint,
        amount,
        record.total_bought
    );

    Ok(())
}

/// Process refund for a buyer from escrow (called by protocol authority)
pub fn process_refund(ctx: Context<ProcessRefund>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_vault;
    let record = &mut ctx.accounts.buyer_record;

    require!(!record.refund_claimed, FyrstError::RefundAlreadyProcessed);
    require!(escrow.rugged, FyrstError::SafePeriodExpired);

    // Calculate pro-rata refund from escrow
    // refund_amount = (buyer_sol_spent / total_curve_sol) * escrow_collateral
    // Simplified: refund up to total_sol_spent, capped by escrow balance
    let refund_amount = record
        .total_sol_spent
        .min(escrow.collateral_amount);

    require!(refund_amount > 0, FyrstError::NoBuyerRecord);

    // Transfer SOL from escrow to buyer
    **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? += refund_amount;

    record.refund_claimed = true;

    msg!(
        "Refund processed: buyer={}, amount={}, mint={}",
        record.buyer,
        refund_amount,
        record.token_mint
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RecordBuyer<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Token mint account
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = BuyerRecord::LEN,
        seeds = [BUYER_SEED, buyer.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessRefund<'info> {
    /// Protocol authority that triggers refunds
    pub authority: Signer<'info>,

    /// CHECK: Buyer receiving the refund
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow_vault.deployer.as_ref(), escrow_vault.token_mint.as_ref()],
        bump = escrow_vault.bump,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(
        mut,
        seeds = [BUYER_SEED, buyer.key().as_ref(), escrow_vault.token_mint.as_ref()],
        bump = buyer_record.bump,
        has_one = buyer,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,

    pub system_program: Program<'info, System>,
}
