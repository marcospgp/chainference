import { Command } from "commander";
import * as helpers from "./helpers";
import { loadChainference } from "./chainference";
import * as anchor from "@coral-xyz/anchor";

const cli = new Command();

cli.action(async () => {
  const wallet = helpers.loadOrCreateWallet("client-wallet.json");

  const chainference = await loadChainference(wallet);

  console.log(
    `Wallet balance: ${await helpers.getBalanceSol(
      wallet.publicKey,
      chainference.provider.connection
    )} SOL`
  );

  await helpers.airdropSolIfBalanceBelow(
    wallet.publicKey,
    1,
    chainference.provider.connection
  );

  console.log(
    `\nFetching all available servers on the Chainference network...`
  );

  // Get all available servers
  const servers = await chainference.account.serverAccount.all();

  console.log(
    `Found ${servers.length} server${servers.length === 1 ? "" : "s"}.`
  );

  if (servers.length === 0) {
    console.log(`Exiting...`);
    process.exit(0);
  }

  console.log(`\nAvailable models:\n`);

  const modelSet: Set<string> = new Set();

  servers.forEach((x) => {
    x.account.models.forEach((y) => modelSet.add(y.id));
  });

  const models = Array.from(modelSet);
  models.sort();

  models.forEach((x, index) => console.log(`${index + 1}. ${x}`));

  const modelIndex =
    parseInt(prompt(`\nPlease select a model (1-${models.length}):`) || "1") -
    1;

  console.log(`\nSelected model "${models[modelIndex]}"`);

  const existingRequests =
    await chainference.account.inferenceRequestAccount.all([
      {
        memcmp: {
          offset: 8,
          bytes: wallet.publicKey.toBase58(),
        },
      },
    ]);

  if (existingRequests.length > 0) {
    console.log(
      `Found ${existingRequests.length} previously existing request${
        existingRequests.length === 1 ? "" : "s"
      }. Canceling...`
    );

    const cancel = await chainference.methods.cancelRequest().rpc();
    await helpers.waitForConfirmation(cancel);
  }

  console.log(`\nYou can now enter a prompt and submit by pressing enter.\n`);

  const userPrompt = prompt("");

  const max_cost = 0.1 * anchor.web3.LAMPORTS_PER_SOL;

  await chainference.methods
    .requestInference(models[modelIndex] || "", new anchor.BN(max_cost))
    .rpc();
});

cli.parse();
