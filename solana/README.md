# Solana

Solana smart contract code.

The smart contract code is in `solana/programs/chainference/src/lib.rs`

There are a lot of files because `anchor init` generates them. I tried to simplify, but then `anchor build` stops working with no error message.

[10 vulnerabilities to avoid when writing Solana programs](https://x.com/pencilflip/status/1483880018858201090)

## Dependencies

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana](https://solana.com/docs/intro/installation)
- [Anchor](https://www.anchor-lang.com/docs/installation)

  - May have to install with `avm install 6fbfc40` to get [this PR](https://github.com/coral-xyz/anchor/pull/3396) which fixes some warnings and hasn't made it into a release yet.
  - There is [an issue](https://github.com/coral-xyz/anchor/issues/3392#issuecomment-2508412018) with `Cargo.lock` that should be fixed in upcoming release v0.31:

    ```
    error: failed to parse lock file at: /Users/marcos/Documents/GitHub/chainference/at/Cargo.lock

    Caused by:
    lock file version 4 requires `-Znext-lockfile-bump`

    ```

    To fix, simply change the version of `Cargo.lock` from 4 to 3.

## Setup

1. Switch to Solana devnet with:

   ```shell
   solana config set --url https://api.devnet.solana.com
   ```

2. Switch to this project's wallet by:

   - Placing (secret) `wallet.json` in project folder
   - Running `solana config set --keypair $PWD/wallet.json`

## Running

- `anchor build` to build project
- `anchor test` to run tests

The [Solana playground](https://beta.solpg.io/) can also be used.
