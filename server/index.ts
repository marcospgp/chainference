import * as helpers from "./helpers";
import { Command } from "commander";
import loadChainference from "./chainference";
import path from "path";
import { loadModels } from "./models";

const cli = new Command();

cli.action(cli.help).option("--prod", "Run against Solana mainnet.");

cli.command("start").action(async () => {
  const options = cli.opts();
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

  const models = loadModels(path.join(__dirname, "models.json"));

  if (servers.length === 0) {
    console.log(`Creating new server with models:`);
    models.forEach((x) => console.log(x));

    await chainference.methods.addServer(models).rpc();
  }

  // Listen for inference requests
  chainference.provider.connection.onProgramAccountChange(
    chainference.programId,
    async (account) => {
      const decoded = chainference.coder.accounts.decode(
        // @ts-expect-error
        chainference.account.inferenceRequestAccount._idlAccount,
        account.accountInfo.data
      );

      console.log("Incoming inference request:");
      console.log(decoded);
    }
  );
});

cli.parse();
