# Solana

Solana smart contract code.

Main folders to look at:

- Smart contract code is in [`programs/chainference/src/`](programs/chainference/src/)
- Tests are in [`tests/`](tests/)
  - These are a good reference for a client side that interacts with the smart contract.

There are a lot of files because `anchor init` generates them. I tried to simplify, but then `anchor build` stops working with no error message.

[10 vulnerabilities to avoid when writing Solana programs](https://x.com/pencilflip/status/1483880018858201090)

## Dependencies

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana](https://solana.com/docs/intro/installation)
- [Anchor](https://www.anchor-lang.com/docs/installation)

  - There is [an issue](https://github.com/coral-xyz/anchor/issues/3392#issuecomment-2508412018) with `Cargo.lock` that should be fixed in upcoming release v0.31:

    ```
    error: failed to parse lock file at: /Users/marcos/Documents/GitHub/chainference/at/Cargo.lock

    Caused by:
    lock file version 4 requires `-Znext-lockfile-bump`

    ```

    To fix, simply change the version of `Cargo.lock` from 4 to 3.

- Yarn
  - Recommended setup: install [nvm](https://github.com/nvm-sh/nvm), run `nvm install --lts && nvm use --lts`, then make Yarn available in the shell with `corepack enable`.

## Setup

1. `yarn install`
1. Switch to Solana devnet with:

   ```shell
   solana config set --url https://api.devnet.solana.com
   ```

1. Switch to this project's wallet by:

   - Placing (secret) `wallet.json` in project folder
   - Running `solana config set --keypair $PWD/wallet.json`

Rust dependencies should be installed automatically by Rust analyzer in VSCode, or when running `anchor build`.

## Running

- `anchor build` to build project
- `anchor test` to run tests on localnet (this will also build the project)
  - `anchor test --provider.cluster devnet` to test on devnet. This will also deploy the program.

The [Solana playground](https://beta.solpg.io/) can also be used.

The localnet can be run separately with `anchor localnet`. Tests can then be run with `anchor test --skip-local-validator --skip-deploy`.

You can explore the localnet ledger on [Solana explorer](https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899) by telling it to connect to `http://localhost:8899`.

## Deploying and undeploying

Before deploying, make sure you have configured Solana to use the project's wallet:

```sh
solana config set --keypair $PWD/wallet.json
```

You can then deploy with `anchor deploy`. Unless this is a production deploy, make sure you're on either localnet or devnet (`provider.cluster` field in [`Anchor.toml`](Anchor.toml)).

The program can be closed with `solana program close <program ID>`, which reclaims the previously 2-year rent down payment.

After closing you will need to rotate the program key by deleting the `target` folder and running `anchor keys sync`:

```text
Error: WARNING! Closed programs cannot be recreated at the same program id. Once a program is closed, it can never be invoked again. To proceed with closing, rerun the `close` command with the `--bypass-warning` flag
```

## Gotchas

- [Automatic account resolution when calling `.accounts()`](https://github.com/coral-xyz/anchor/issues/3515)
