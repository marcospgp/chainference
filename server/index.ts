import * as helpers from "./helpers";
import { Command } from "commander";
import { loadChainference } from "./chainference";
import path from "path";
import { loadModels } from "./models";

const cli = new Command();

cli.action(cli.help).option("--prod", "Run against Solana mainnet.");

cli.command("start").action(async () => {
  const options = cli.opts();
  const isProd = options["prod"] || false;

  console.log(
    `Starting chainference server (${
      isProd ? "production (/!\\)" : "development"
    } mode)...`
  );
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

  let serversLog = `Found ${servers.length} server${
    servers.length === 1 ? "" : "s"
  } registered with current wallet`;

  if (servers.length === 0) {
    serversLog += ".";
  } else {
    serversLog += `: ${servers.map((s) => s.publicKey).join(", ")}.`;
  }

  console.log(serversLog);

  if (servers.length > 0) {
    console.log(`Closing existing server${servers.length === 1 ? "" : "s"}...`);

    const transactions = await Promise.all(
      servers.map((s) =>
        chainference.methods
          .closeServer()
          .accounts({
            serverAccount: s.publicKey,
          })
          .rpc()
      )
    );

    await Promise.all(
      transactions.map((t) => helpers.waitForConfirmation([t]))
    );
  }

  const models = loadModels(path.join(__dirname, "models.json"));

  console.log(`Creating new server with models:`);
  models.forEach((x) => console.log(x));

  const transaction = await chainference.methods.addServer(models).rpc();

  await helpers.waitForConfirmation([transaction]);

  const servers2 = await chainference.account.serverAccount.all([
    {
      memcmp: {
        offset: 8,
        bytes: wallet.publicKey.toBase58(),
      },
    },
  ]);

  if (servers2.length !== 1) {
    throw new Error(`Unexpected server account count: ${servers2.length}`);
  }

  const server = servers2[0]!;

  console.log(`Created server with public key ${server.publicKey}`);

  helpers.closeServerOnExit(server.publicKey, chainference);

  console.log(`Listening for inference requests...`);

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
