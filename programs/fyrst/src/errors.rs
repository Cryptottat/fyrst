use anchor_lang::prelude::*;

#[error_code]
pub enum FyrstError {
    #[msg("Collateral amount is below minimum (0.1 SOL)")]
    InsufficientCollateral,

    #[msg("Token has not graduated yet")]
    NotGraduated,

    #[msg("Deadline has not been reached yet")]
    DeadlineNotReached,

    #[msg("Unauthorized: not the escrow owner")]
    Unauthorized,

    #[msg("Escrow is already released")]
    EscrowAlreadyReleased,

    #[msg("Insufficient SOL for purchase")]
    InsufficientFunds,

    #[msg("Insufficient tokens for sale")]
    InsufficientTokens,

    #[msg("Bonding curve already graduated")]
    AlreadyGraduated,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid price calculation")]
    InvalidPrice,

    #[msg("Invalid metadata: name/symbol/URI exceeds length limit")]
    InvalidMetadata,

    #[msg("Token mint does not match bonding curve")]
    TokenMintMismatch,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,

    #[msg("Duration out of allowed range (1h–7d)")]
    InvalidDuration,

    #[msg("No fees to claim")]
    NoFeesToClaim,

    #[msg("Token already migrated to DEX")]
    AlreadyMigratedToDex,

    #[msg("Reserve balance is zero — nothing to migrate")]
    EmptyReserve,

    #[msg("Tokens are still in circulation — use process_refund instead")]
    TokensStillCirculating,
}
