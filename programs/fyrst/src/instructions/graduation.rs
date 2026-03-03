use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, program::invoke_signed, program::invoke};
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, SetAuthority};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::BondingCurve;
use crate::errors::FyrstError;
use crate::constants::*;

/// Graduate a bonding curve to Raydium CPMM DEX.
///
/// Permissionless — anyone can call once `graduated == true`.
///
/// Flow:
/// 1. Validate graduated && !dex_migrated
/// 2. Calculate pool token amount (match bonding curve final price)
/// 3. Mint tokens to curve's token ATA
/// 4. Wrap reserve SOL into WSOL
/// 5. CPI to Raydium CPMM: initialize pool + add liquidity
/// 6. Burn LP tokens (permanent liquidity lock)
/// 7. Revoke mint authority (no more minting ever)
/// 8. Update state: dex_migrated = true, raydium_pool = pool address
pub fn graduate_to_dex(ctx: Context<GraduateToDex>) -> Result<()> {
    let curve = &ctx.accounts.bonding_curve;

    // 1. Validate
    require!(curve.graduated, FyrstError::NotGraduated);
    require!(!curve.dex_migrated, FyrstError::AlreadyMigratedToDex);
    require!(curve.reserve_balance > 0, FyrstError::EmptyReserve);

    let reserve_sol = curve.reserve_balance;
    let token_mint_key = curve.token_mint;
    let curve_bump = curve.bump;

    // 2. Calculate pool tokens: match the bonding curve final price
    // spot_price = base_price + slope * (current_supply / D)
    // pool_tokens = reserve_sol * D / spot_price
    // This ensures Raydium initial price ≈ bonding curve final price (no arb)
    let d = 10u64.pow(TOKEN_DECIMALS as u32) as u128;
    let bp = curve.base_price as u128;
    let sl = curve.slope as u128;
    let supply = curve.current_supply as u128;

    let spot_price = bp + sl * supply / d;
    require!(spot_price > 0, FyrstError::InvalidPrice);

    let pool_tokens = ((reserve_sol as u128) * d / spot_price) as u64;
    require!(pool_tokens > 0, FyrstError::InvalidPrice);

    let seeds = &[
        CURVE_SEED,
        token_mint_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // 3. Mint pool tokens to curve's token ATA
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.curve_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        pool_tokens,
    )?;

    // 4. Transfer reserve SOL from curve PDA to WSOL ATA, then sync_native
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= reserve_sol;
    **ctx.accounts.curve_wsol_account.to_account_info().try_borrow_mut_lamports()? += reserve_sol;

    // sync_native to update WSOL token balance from lamports
    let sync_ix = anchor_spl::token::spl_token::instruction::sync_native(
        &anchor_spl::token::ID,
        &ctx.accounts.curve_wsol_account.key(),
    )?;
    invoke(&sync_ix, &[ctx.accounts.curve_wsol_account.to_account_info()])?;

    // 5. CPI to Raydium CPMM — initialize pool
    //
    // Raydium CPMM `initialize` instruction layout:
    //   discriminator: [175, 175, 109, 31, 13, 152, 155, 237] (8 bytes)
    //   init_amount_0: u64
    //   init_amount_1: u64
    //   open_time: u64 (0 = immediate)
    //
    // Token ordering: token0 < token1 by mint pubkey bytes
    let wsol_mint_key = ctx.accounts.wsol_mint.key();
    let (amount_0, amount_1) = if wsol_mint_key < token_mint_key {
        (reserve_sol, pool_tokens)
    } else {
        (pool_tokens, reserve_sol)
    };

    let mut ix_data = vec![175, 175, 109, 31, 13, 152, 155, 237]; // initialize discriminator
    ix_data.extend_from_slice(&amount_0.to_le_bytes());
    ix_data.extend_from_slice(&amount_1.to_le_bytes());
    ix_data.extend_from_slice(&0u64.to_le_bytes()); // open_time = 0 (immediate)

    // Build account metas for Raydium CPMM initialize
    let (token_0_mint, token_1_mint, token_0_vault, token_1_vault, creator_token_0, creator_token_1) =
        if wsol_mint_key < token_mint_key {
            (
                ctx.accounts.wsol_mint.to_account_info(),
                ctx.accounts.token_mint.to_account_info(),
                ctx.accounts.token_0_vault.to_account_info(),
                ctx.accounts.token_1_vault.to_account_info(),
                ctx.accounts.curve_wsol_account.to_account_info(),
                ctx.accounts.curve_token_account.to_account_info(),
            )
        } else {
            (
                ctx.accounts.token_mint.to_account_info(),
                ctx.accounts.wsol_mint.to_account_info(),
                ctx.accounts.token_0_vault.to_account_info(),
                ctx.accounts.token_1_vault.to_account_info(),
                ctx.accounts.curve_token_account.to_account_info(),
                ctx.accounts.curve_wsol_account.to_account_info(),
            )
        };

    let initialize_ix = solana_program::instruction::Instruction {
        program_id: ctx.accounts.cp_swap_program.key(),
        accounts: vec![
            // 0. creator (signer, mut) — curve PDA
            solana_program::instruction::AccountMeta::new(ctx.accounts.bonding_curve.key(), true),
            // 1. amm_config
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.amm_config.key(), false),
            // 2. authority (Raydium PDA — read only)
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.raydium_authority.key(), false),
            // 3. pool_state (mut)
            solana_program::instruction::AccountMeta::new(ctx.accounts.pool_state.key(), false),
            // 4. token_0_mint
            solana_program::instruction::AccountMeta::new_readonly(token_0_mint.key(), false),
            // 5. token_1_mint
            solana_program::instruction::AccountMeta::new_readonly(token_1_mint.key(), false),
            // 6. token_0_vault (mut)
            solana_program::instruction::AccountMeta::new(token_0_vault.key(), false),
            // 7. token_1_vault (mut)
            solana_program::instruction::AccountMeta::new(token_1_vault.key(), false),
            // 8. create_pool_fee (mut) — Raydium fee receiver
            solana_program::instruction::AccountMeta::new(ctx.accounts.create_pool_fee.key(), false),
            // 9. creator_token_0 (mut)
            solana_program::instruction::AccountMeta::new(creator_token_0.key(), false),
            // 10. creator_token_1 (mut)
            solana_program::instruction::AccountMeta::new(creator_token_1.key(), false),
            // 11. creator_lp_token (mut) — Raydium creates this ATA
            solana_program::instruction::AccountMeta::new(ctx.accounts.creator_lp_token.key(), false),
            // 12. lp_mint (mut)
            solana_program::instruction::AccountMeta::new(ctx.accounts.lp_mint.key(), false),
            // 13. token_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            // 14. associated_token_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.associated_token_program.key(), false),
            // 15. system_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
            // 16. rent
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.rent.key(), false),
            // 17. observation_state (mut)
            solana_program::instruction::AccountMeta::new(ctx.accounts.observation_state.key(), false),
        ],
        data: ix_data,
    };

    invoke_signed(
        &initialize_ix,
        &[
            ctx.accounts.bonding_curve.to_account_info(),
            ctx.accounts.amm_config.to_account_info(),
            ctx.accounts.raydium_authority.to_account_info(),
            ctx.accounts.pool_state.to_account_info(),
            token_0_mint,
            token_1_mint,
            token_0_vault,
            token_1_vault,
            ctx.accounts.create_pool_fee.to_account_info(),
            creator_token_0,
            creator_token_1,
            ctx.accounts.creator_lp_token.to_account_info(),
            ctx.accounts.lp_mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.associated_token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ctx.accounts.observation_state.to_account_info(),
        ],
        signer_seeds,
    )?;

    // 6. Burn all LP tokens (permanent liquidity lock — pump.fun pattern)
    // creator_lp_token is UncheckedAccount — Raydium created it during CPI.
    // Read the token account data manually to get LP balance.
    {
        let lp_data = ctx.accounts.creator_lp_token.try_borrow_data()?;
        // SPL token account layout: mint(32) + owner(32) + amount(u64 at offset 64)
        if lp_data.len() >= 72 {
            let amount_bytes: [u8; 8] = lp_data[64..72].try_into().unwrap();
            let lp_amount = u64::from_le_bytes(amount_bytes);
            drop(lp_data); // release borrow before CPI

            if lp_amount > 0 {
                let burn_ix = anchor_spl::token::spl_token::instruction::burn(
                    &anchor_spl::token::ID,
                    &ctx.accounts.creator_lp_token.key(),
                    &ctx.accounts.lp_mint.key(),
                    &ctx.accounts.bonding_curve.key(),
                    &[],
                    lp_amount,
                )?;
                invoke_signed(
                    &burn_ix,
                    &[
                        ctx.accounts.creator_lp_token.to_account_info(),
                        ctx.accounts.lp_mint.to_account_info(),
                        ctx.accounts.bonding_curve.to_account_info(),
                    ],
                    signer_seeds,
                )?;
            }
        }
    }

    // 7. Revoke mint authority (no more tokens can ever be minted)
    token::set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                account_or_mint: ctx.accounts.token_mint.to_account_info(),
                current_authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
        None,
    )?;

    // 8. Update state
    let curve = &mut ctx.accounts.bonding_curve;
    curve.dex_migrated = true;
    curve.raydium_pool = ctx.accounts.pool_state.key();
    curve.reserve_balance = 0;

    msg!(
        "DEX migration: mint={}, pool={}, sol={}, tokens={}",
        token_mint_key,
        ctx.accounts.pool_state.key(),
        reserve_sol,
        pool_tokens
    );

    Ok(())
}

#[derive(Accounts)]
pub struct GraduateToDex<'info> {
    /// Anyone can trigger graduation (permissionless)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Bonding curve PDA — must be graduated and not yet migrated
    #[account(
        mut,
        seeds = [CURVE_SEED, bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump,
        constraint = bonding_curve.graduated @ FyrstError::NotGraduated,
        constraint = !bonding_curve.dex_migrated @ FyrstError::AlreadyMigratedToDex,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// Token mint (curve PDA is mint authority)
    #[account(
        mut,
        address = bonding_curve.token_mint @ FyrstError::TokenMintMismatch,
    )]
    pub token_mint: Account<'info, Mint>,

    /// WSOL mint
    #[account(mut)]
    pub wsol_mint: Account<'info, Mint>,

    /// Curve PDA's token ATA (holds tokens for Raydium deposit)
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

    /// Curve PDA's WSOL ATA (holds wrapped SOL for Raydium deposit)
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = wsol_mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_wsol_account: Account<'info, TokenAccount>,

    // ---- Raydium CPMM accounts (validated by the CPI call) ----

    /// CHECK: Raydium CPMM program
    pub cp_swap_program: UncheckedAccount<'info>,

    /// CHECK: Raydium AMM config — validated by Raydium CPI
    pub amm_config: UncheckedAccount<'info>,

    /// CHECK: Raydium pool authority PDA — validated by Raydium CPI
    pub raydium_authority: UncheckedAccount<'info>,

    /// CHECK: Pool state account (created by Raydium CPI)
    #[account(mut)]
    pub pool_state: UncheckedAccount<'info>,

    /// CHECK: Token 0 vault (created by Raydium CPI)
    #[account(mut)]
    pub token_0_vault: UncheckedAccount<'info>,

    /// CHECK: Token 1 vault (created by Raydium CPI)
    #[account(mut)]
    pub token_1_vault: UncheckedAccount<'info>,

    /// CHECK: Raydium pool creation fee receiver
    #[account(mut)]
    pub create_pool_fee: UncheckedAccount<'info>,

    /// CHECK: LP mint (created by Raydium CPI)
    #[account(mut)]
    pub lp_mint: UncheckedAccount<'info>,

    /// CHECK: LP token account for curve PDA — created by Raydium CPI, then burned
    #[account(mut)]
    pub creator_lp_token: UncheckedAccount<'info>,

    /// CHECK: Observation state account (created by Raydium CPI)
    #[account(mut)]
    pub observation_state: UncheckedAccount<'info>,

    // ---- Programs ----
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
