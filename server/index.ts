import * as helpers from "./helpers";
import { Command } from "commander";
import { loadChainference } from "./chainference";
import path from "path";
import { loadModels } from "./models";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import { startServer } from "./server";

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
    await helpers.airdropSolIfBalanceBelow(
      wallet.publicKey,
      1,
      chainference.provider.connection
    );
  }

  const existingServers = await chainference.account.serverAccount.all([
    {
      memcmp: {
        offset: 8,
        bytes: wallet.publicKey.toBase58(),
      },
    },
  ]);

  let serversLog = `Found ${existingServers.length} server${
    existingServers.length === 1 ? "" : "s"
  } registered with current wallet`;

  if (existingServers.length === 0) {
    serversLog += ".";
  } else {
    serversLog += `: ${existingServers.map((s) => s.publicKey).join(", ")}.`;
  }

  console.log(serversLog);

  if (existingServers.length > 0) {
    console.log(
      `Closing existing server${existingServers.length === 1 ? "" : "s"}...`
    );

    const transactions = await Promise.all(
      existingServers.map((s) =>
        chainference.methods
          .closeServer()
          .accounts({
            serverAccount: s.publicKey,
          })
          .rpc()
      )
    );

    await Promise.all(transactions.map((t) => helpers.waitForConfirmation(t)));
  }

  const models = loadModels(path.join(__dirname, "models.json"));

  console.log(`Creating new server with models:`);
  models.forEach((x) => console.log(x));

  const transaction = await chainference.methods.addServer(models).rpc();

  await helpers.waitForConfirmation(transaction);

  const servers = await chainference.account.serverAccount.all([
    {
      memcmp: {
        offset: 8,
        bytes: wallet.publicKey.toBase58(),
      },
    },
  ]);

  if (servers.length !== 1) {
    throw new Error(`Unexpected server account count: ${servers.length}`);
  }

  const server = servers[0]!;

  console.log(
    `Created on-chain server account with address "${server.publicKey}"`
  );

  helpers.closeServerOnExit(server.publicKey, chainference);

  // 3819 meaning "chai" as in chainference.
  const port = 3819;
  startServer(port, chainference);

  console.log(`Listening for inference requests...`);

  chainference.provider.connection.onProgramAccountChange(
    chainference.programId,
    async (account) => {
      // Holy shit this is how you properly type a decoded program account 🤮
      // https://github.com/coral-xyz/anchor/issues/3552
      let request: IdlAccounts<Chainference>["inferenceRequestAccount"];
      try {
        request = chainference.coder.accounts.decode(
          // @ts-expect-error: _idlAccount is a private field.
          chainference.account.inferenceRequestAccount._idlAccount.name,
          account.accountInfo.data
        );
      } catch (e) {
        // Invalid account discriminator
        if (
          e instanceof Error &&
          e.message.includes("Invalid account discriminator")
        ) {
          return;
        }
        throw e;
      }

      if (request.lockedBy !== null) {
        return;
      }

      console.log("Detected new not-yet-locked inference request.");

      if (models.find((model) => model.id === request.model) !== undefined) {
        const sendPromptTo = `https://ask.chainference.app/${account.accountId.toBase58()}`;
        await chainference.methods
          .lockRequest(sendPromptTo)
          .accounts({
            request: account.accountId,
            server: server.publicKey,
          })
          .rpc();
      }
    }
  );
});

cli.parse();
