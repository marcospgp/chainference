import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import * as helpers from "./helpers";

import { Command } from "commander";

const program = new Command();

program.action(program.help).option("--prod", "Run against Solana mainnet.");

program.command("start").action(async () => {
  const options = program.opts();
  const isProd = options["prod"] || false;

  console.log(`Running in ${isProd ? "production" : "development"} mode.`);
  const wallet = helpers.loadOrCreateWallet();

  const provider = await helpers.setAnchorProvider(wallet, isProd);

  console.log(
    `Wallet balance: ${await helpers.getBalanceSol(
      wallet.publicKey,
      provider.connection
    )} SOL`
  );

  helpers.maybeAirdropSol(wallet.publicKey, 1, provider.connection);
});

program.parse();
