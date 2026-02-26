# FYRST Anchor Program - Build Notes

## Build Issue (February 2026)

### Problem

`anchor build` failed with two related errors:

1. **Cargo.lock v4 incompatibility**: Rust 1.86 generates Cargo.lock version 4, but
   anchor-cli 0.31.1 uses an internal Cargo 1.75 that cannot parse v4 lockfiles.

2. **`edition2024` feature not stabilized**: The `blake3` crate v1.8.3 (a transitive
   dependency via `solana-program -> solana-blake3-hasher -> blake3`) uses
   `edition = "2024"` in its Cargo.toml. Cargo 1.75 (bundled with anchor-cli 0.31.1)
   and Cargo 1.79 (bundled with Solana CLI 2.1.x / platform-tools v1.43) do not
   support this edition, causing a parse failure at download time.

3. **Additional `rustc` MSRV mismatches**: Even after fixing blake3, crates like
   `indexmap 2.13.0` require `rustc 1.82+`, `borsh 1.6.0` requires `rustc 1.77+`, etc.
   The Solana platform-tools bundled rustc was too old.

### Root Cause

The dependency chain is:
```
fyrst -> anchor-lang 0.31.1 -> solana-program 2.3.0 -> solana-blake3-hasher 2.2.1 -> blake3 1.8.3
```

blake3 v1.8.3 (released Jan 2026) switched to Rust edition 2024, which requires
Cargo 1.85+. The Solana build toolchain (`cargo-build-sbf`) ships its own Cargo/rustc
via "platform-tools", and older versions of these tools cannot handle edition 2024 or
the MSRV requirements of newer crate releases.

### Solution Applied

Two changes were needed:

#### 1. Upgrade Solana CLI to v2.2.12 (platform-tools v1.47)

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v2.2.12/install)"
```

This upgraded the bundled platform-tools from v1.41 (Cargo 1.75 / rustc 1.75.0-dev)
to v1.47, which includes a sufficiently new rustc to handle all dependency MSRV
requirements and the Cargo.lock v4 format.

**Note**: Intermediate versions were tested:
- Solana CLI 2.1.21 (platform-tools v1.43, Cargo 1.79) -- still too old for
  `edition2024` and `indexmap 2.13.0` MSRV.
- Solana CLI 2.2.12 (platform-tools v1.47) -- works correctly.

#### 2. Pin blake3 to v1.8.2

blake3 1.8.2 is the last version using `edition = "2021"`. Pin it with:

```bash
cargo update blake3@1.8.3 --precise 1.8.2
```

This avoids the `edition2024` parse error entirely, as a belt-and-suspenders measure.
In practice, with platform-tools v1.47 this may no longer be strictly required, but
it ensures compatibility across different build environments.

#### 3. Code fixes (borrow checker and feature flag)

The program source had Rust borrow checker violations and a missing feature flag:

- **`init-if-needed` feature**: The `RecordBuyer` account struct uses
  `init_if_needed`, which requires the `init-if-needed` feature on `anchor-lang`.
  Added to `programs/fyrst/Cargo.toml`:
  ```toml
  anchor-lang = { version = "0.31.1", features = ["init-if-needed"] }
  ```

- **Borrow checker fixes**: Several functions had simultaneous mutable and immutable
  borrows of the same account (e.g., `&mut ctx.accounts.escrow_vault` held while
  calling `ctx.accounts.escrow_vault.to_account_info()`). Fixed by restructuring
  borrow lifetimes -- scoping mutable borrows to end before immutable accesses,
  or reordering CPI calls before mutable state updates.

### Current Working Environment

```
anchor-cli:       0.31.1
solana-cli:       2.2.12 (Agave)
platform-tools:   v1.47
system rustc:     1.86.0 (not used by anchor build)
system cargo:     1.86.0 (used for lockfile generation)
```

### Build Command

```bash
anchor build
```

### Output Artifacts

- `target/deploy/fyrst.so` -- Compiled SBF program binary
- `target/deploy/fyrst-keypair.json` -- Program keypair
- `target/idl/fyrst.json` -- Anchor IDL
- `target/types/fyrst.ts` -- TypeScript type definitions

### Future Considerations

- When `anchor-cli` is upgraded beyond 0.31.1 (e.g., 0.32.x), the bundled
  platform-tools will likely support `edition2024` natively, removing the need
  to pin blake3.
- The `anchor-cli 0.32.1` installation was attempted but failed because the
  `time` crate v0.3.47 requires `rustc 1.88.0`, which is newer than the
  system's rustc 1.86.0. This will resolve when rustc 1.88+ is available via
  `rustup update stable`.
