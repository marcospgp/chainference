import * as helpers from "./helpers";
import { Command } from "commander";
import loadChainference from "./chainference";

const program = new Command();

program.action(program.help).option("--prod", "Run against Solana mainnet.");

program.command("start").action(async () => {
  const options = program.opts();
  const isProd = options["prod"] || false;

  console.log(`Running in ${isProd ? "production" : "development"} mode.`);
  const wallet = helpers.loadOrCreateWallet();

  const chainference = await loadChainference(wallet, isProd);

  console.log(
    `Wallet balance: ${await helpers.getBalanceSol(
      wallet.publicKey,
      chainference.provider.connection
    )} SOL`
  );

  if (!isProd) {
    helpers.airdropSolIfBalanceBelow(
      wallet.publicKey,
      1,
      chainference.provider.connection
    );
  }
});

program.parse();
