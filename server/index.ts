import * as anchor from "@coral-xyz/anchor";
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

  const servers = await chainference.account.serverAccount.all([
    {
      memcmp: {
        offset: 8,
        bytes: wallet.publicKey.toBase58(),
      },
    },
  ]);

  console.log(
    `Found ${servers.length} server${
      servers.length === 1 ? "" : "s"
    } registered with current wallet${servers.length === 0 ? "." : ":"}`
  );

  servers.forEach((x) => console.log(x));

  // TODO: these should be specified in config file I think.
  const models = [
    {
      id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
      price: new anchor.BN(400000),
    },
  ];

  if (servers.length === 0) {
    console.log(`Creating new server with models:`);
    models.forEach((x) => console.log(x));

    await chainference.methods.addServer(models).rpc();
  }
});

program.parse();
