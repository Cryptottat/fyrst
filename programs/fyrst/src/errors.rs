use anchor_lang::prelude::*;

#[error_code]
pub enum FyrstError {
    #[msg("Collateral amount is below minimum (1 SOL)")]
    InsufficientCollateral,

    #[msg("Safe period has not ended yet")]
    SafePeriodActive,

    #[msg("Safe period has already ended")]
    SafePeriodExpired,

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

    #[msg("Refund already processed")]
    RefundAlreadyProcessed,

    #[msg("No buyer record found")]
    NoBuyerRecord,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid price calculation")]
    InvalidPrice,

    #[msg("Token has been rugged — escrow release blocked")]
    TokenIsRugged,

    #[msg("Escrow is already marked as rugged")]
    EscrowIsRugged,

    #[msg("Invalid metadata: name/symbol/URI exceeds length limit")]
    InvalidMetadata,

    #[msg("Token mint does not match bonding curve")]
    TokenMintMismatch,
}
