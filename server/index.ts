import * as helpers from "./helpers";
import { Command } from "commander";
import { loadChainference } from "./chainference";
import path from "path";
import { loadModels } from "./models";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";

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

  const myProgram = await loadChainference(wallet, isProd);

  console.log(
    `Wallet balance: ${await helpers.getBalanceSol(
      wallet.publicKey,
      myProgram.provider.connection
    )} SOL`
  );

  if (!isProd) {
    await helpers.airdropSolIfBalanceBelow(
      wallet.publicKey,
      1,
      myProgram.provider.connection
    );
  }

  const servers = await myProgram.account.serverAccount.all([
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
        myProgram.methods
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

  const transaction = await myProgram.methods.addServer(models).rpc();

  await helpers.waitForConfirmation(transaction);

  const servers2 = await myProgram.account.serverAccount.all([
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

  helpers.closeServerOnExit(server.publicKey, myProgram);

  console.log(`Listening for inference requests...`);

  myProgram.provider.connection.onProgramAccountChange(
    myProgram.programId,
    async (account) => {
      // Holy shit this is how you properly type a decoded program account 🤮
      // https://github.com/coral-xyz/anchor/issues/3552
      const request: IdlAccounts<Chainference>["inferenceRequestAccount"] =
        myProgram.coder.accounts.decode(
          // @ts-expect-error: we have to access a private field here.
          myProgram.account.inferenceRequestAccount._idlAccount,
          account.accountInfo.data
        );

      console.log("Detected new inference request:");
      console.log(request);

      if (request.lockedBy !== null) {
        console.log(`Request already locked. Skipping...`);
        return;
      }

      if (models.find((model) => model.id === request.model) !== undefined) {
        const sendPromptTo = `https://ask.chainference.app/${account.accountId.toBase58()}`;
        myProgram.methods.lockRequest(sendPromptTo);
      }
    }
  );
});

cli.parse();
