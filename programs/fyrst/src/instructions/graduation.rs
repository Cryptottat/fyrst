use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, program::invoke, program::invoke_signed};
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, SetAuthority};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::BondingCurve;
use crate::errors::FyrstError;
use crate::constants::*;

/// Graduate a bonding curve to Raydium CPMM DEX.
///
/// Permissionless — anyone can call once `graduated == true`.
///
/// The payer acts as the Raydium pool creator (must be system-owned for rent).
/// Payer pre-funds their own WSOL ATA; the program mints tokens to payer's
/// token ATA. After the Raydium CPI, LP tokens are burned, mint authority
/// is revoked, and payer is reimbursed from the bonding curve.
///
/// Transaction structure (client builds preceding IXs):
///   IX 0: ComputeBudget (1.4M CU)
///   IX 1: Create payer WSOL ATA (if needed)
///   IX 2: Create payer token ATA (if needed)
///   IX 3: SystemProgram::Transfer(payer → payer_wsol_ata, reserve_sol)
///   IX 4: SPL Token sync_native(payer_wsol_ata)
///   IX 5: This instruction (graduate_to_dex)
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

    // Verify payer's WSOL ATA has been pre-funded
    {
        let wsol_data = ctx.accounts.payer_wsol_account.try_borrow_data()?;
        require!(wsol_data.len() >= 72, FyrstError::EmptyReserve);
        let amount_bytes: [u8; 8] = wsol_data[64..72].try_into().unwrap();
        let wsol_amount = u64::from_le_bytes(amount_bytes);
        require!(wsol_amount >= reserve_sol, FyrstError::EmptyReserve);
    }

    // 3. Mint pool tokens to PAYER's token ATA (bonding_curve PDA = mint authority)
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.payer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        pool_tokens,
    )?;

    // 4. CPI to Raydium CPMM — initialize pool (payer = creator)
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

    let (token_0_mint, token_1_mint, token_0_vault, token_1_vault, creator_token_0, creator_token_1) =
        if wsol_mint_key < token_mint_key {
            (
                ctx.accounts.wsol_mint.to_account_info(),
                ctx.accounts.token_mint.to_account_info(),
                ctx.accounts.token_0_vault.to_account_info(),
                ctx.accounts.token_1_vault.to_account_info(),
                ctx.accounts.payer_wsol_account.to_account_info(),
                ctx.accounts.payer_token_account.to_account_info(),
            )
        } else {
            (
                ctx.accounts.token_mint.to_account_info(),
                ctx.accounts.wsol_mint.to_account_info(),
                ctx.accounts.token_0_vault.to_account_info(),
                ctx.accounts.token_1_vault.to_account_info(),
                ctx.accounts.payer_token_account.to_account_info(),
                ctx.accounts.payer_wsol_account.to_account_info(),
            )
        };

    // Account ordering MUST match Raydium CPMM Initialize struct exactly
    let initialize_ix = solana_program::instruction::Instruction {
        program_id: ctx.accounts.cp_swap_program.key(),
        accounts: vec![
            solana_program::instruction::AccountMeta::new(ctx.accounts.payer.key(), true),                 // 0: creator (payer)
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.amm_config.key(), false),  // 1: amm_config
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.raydium_authority.key(), false), // 2: authority
            solana_program::instruction::AccountMeta::new(ctx.accounts.pool_state.key(), false),           // 3: pool_state
            solana_program::instruction::AccountMeta::new_readonly(token_0_mint.key(), false),             // 4: token_0_mint
            solana_program::instruction::AccountMeta::new_readonly(token_1_mint.key(), false),             // 5: token_1_mint
            solana_program::instruction::AccountMeta::new(ctx.accounts.lp_mint.key(), false),              // 6: lp_mint
            solana_program::instruction::AccountMeta::new(creator_token_0.key(), false),                   // 7: creator_token_0
            solana_program::instruction::AccountMeta::new(creator_token_1.key(), false),                   // 8: creator_token_1
            solana_program::instruction::AccountMeta::new(ctx.accounts.creator_lp_token.key(), false),     // 9: creator_lp_token
            solana_program::instruction::AccountMeta::new(token_0_vault.key(), false),                     // 10: token_0_vault
            solana_program::instruction::AccountMeta::new(token_1_vault.key(), false),                     // 11: token_1_vault
            solana_program::instruction::AccountMeta::new(ctx.accounts.create_pool_fee.key(), false),      // 12: create_pool_fee
            solana_program::instruction::AccountMeta::new(ctx.accounts.observation_state.key(), false),    // 13: observation_state
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.token_program.key(), false), // 14: token_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.token_program.key(), false), // 15: token_0_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.token_program.key(), false), // 16: token_1_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.associated_token_program.key(), false), // 17: associated_token_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.system_program.key(), false), // 18: system_program
            solana_program::instruction::AccountMeta::new_readonly(ctx.accounts.rent.key(), false),        // 19: rent
        ],
        data: ix_data,
    };

    // Use invoke (not invoke_signed) — payer is a transaction-level signer
    invoke(
        &initialize_ix,
        &[
            ctx.accounts.payer.to_account_info(),               // 0: creator (payer)
            ctx.accounts.amm_config.to_account_info(),          // 1: amm_config
            ctx.accounts.raydium_authority.to_account_info(),   // 2: authority
            ctx.accounts.pool_state.to_account_info(),          // 3: pool_state
            token_0_mint,                                       // 4: token_0_mint
            token_1_mint,                                       // 5: token_1_mint
            ctx.accounts.lp_mint.to_account_info(),             // 6: lp_mint
            creator_token_0,                                    // 7: creator_token_0
            creator_token_1,                                    // 8: creator_token_1
            ctx.accounts.creator_lp_token.to_account_info(),    // 9: creator_lp_token
            token_0_vault,                                      // 10: token_0_vault
            token_1_vault,                                      // 11: token_1_vault
            ctx.accounts.create_pool_fee.to_account_info(),     // 12: create_pool_fee
            ctx.accounts.observation_state.to_account_info(),   // 13: observation_state
            ctx.accounts.token_program.to_account_info(),       // 14: token_program
            ctx.accounts.token_program.to_account_info(),       // 15: token_0_program
            ctx.accounts.token_program.to_account_info(),       // 16: token_1_program
            ctx.accounts.associated_token_program.to_account_info(), // 17: associated_token_program
            ctx.accounts.system_program.to_account_info(),      // 18: system_program
            ctx.accounts.rent.to_account_info(),                // 19: rent
        ],
    )?;

    // 5. Burn all LP tokens (permanent liquidity lock)
    // LP tokens are in payer's LP ATA (created by Raydium). Payer authorizes burn via tx signature.
    {
        let lp_data = ctx.accounts.creator_lp_token.try_borrow_data()?;
        if lp_data.len() >= 72 {
            let amount_bytes: [u8; 8] = lp_data[64..72].try_into().unwrap();
            let lp_amount = u64::from_le_bytes(amount_bytes);
            drop(lp_data);

            if lp_amount > 0 {
                let burn_ix = anchor_spl::token::spl_token::instruction::burn(
                    &anchor_spl::token::ID,
                    &ctx.accounts.creator_lp_token.key(),
                    &ctx.accounts.lp_mint.key(),
                    &ctx.accounts.payer.key(),
                    &[],
                    lp_amount,
                )?;
                invoke(
                    &burn_ix,
                    &[
                        ctx.accounts.creator_lp_token.to_account_info(),
                        ctx.accounts.lp_mint.to_account_info(),
                        ctx.accounts.payer.to_account_info(),
                    ],
                )?;
            }
        }
    }

    // 6. Revoke mint authority (no more tokens can ever be minted)
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

    // 7. Reimburse payer from bonding curve reserve (AFTER all CPIs — no more CPIs follow)
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= reserve_sol;
    **ctx.accounts.payer.to_account_info().try_borrow_mut_lamports()? += reserve_sol;

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
    /// Anyone can trigger graduation (permissionless).
    /// Acts as Raydium pool creator. Pre-funds WSOL ATA before this IX.
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

    /// WSOL mint (read-only — Raydium CPI reads it)
    pub wsol_mint: Account<'info, Mint>,

    /// Payer's token ATA — receives minted pool tokens
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = payer,
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Payer's WSOL ATA — must be pre-funded before this IX
    #[account(mut)]
    pub payer_wsol_account: UncheckedAccount<'info>,

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

    /// CHECK: LP token account for payer — created by Raydium CPI, then burned
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
