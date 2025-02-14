import { Command } from "commander";
import * as helpers from "./helpers";
import { loadChainference } from "./chainference";
import * as anchor from "@coral-xyz/anchor";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import nacl from "tweetnacl";

type InferenceRequestAccount = anchor.ProgramAccount<
  IdlAccounts<Chainference>["inferenceRequestAccount"]
>;

type ChatPrompt = { role: "assistant" | "user"; content: string }[];

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

  await helpers.airdropIfBalanceBelowSol(
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

  const model = models[modelIndex]!;

  console.log(`\nSelected model "${model}"\n`);

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
    logEphemeral(
      `Found ${existingRequests.length} existing request${
        existingRequests.length === 1 ? "" : "s"
      }. Canceling ${existingRequests.length === 1 ? "it" : "them"}`
    );

    const cancel = await chainference.methods.cancelRequest().rpc();
    await helpers.waitForConfirmation(cancel);

    logEphemeral("");
  }

  console.log(`You can now write your prompt and submit by pressing enter.\n`);

  const max_cost = new anchor.BN(0.1).mul(
    new anchor.BN(anchor.web3.LAMPORTS_PER_SOL)
  );

  const messages: ChatPrompt = [];

  const promptPrefix = "> ";
  process.stdout.write(promptPrefix);

  for await (const input of console) {
    messages.push({
      role: "user",
      content: input,
    });

    const reader = (
      await promptModel(chainference, wallet, model, messages, max_cost)
    ).getReader();
    let response = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      response += "";
      process.stdout.write(value);
    }

    messages.push({
      role: "assistant",
      content: response,
    });

    process.stdout.write(promptPrefix);
  }
});

cli.parse();

async function waitForRequestToBeLocked(
  chainference: anchor.Program<Chainference>,
  wallet: anchor.web3.Keypair,
  timeoutMs: number = 100
): Promise<InferenceRequestAccount> {
  let request: InferenceRequestAccount;

  while (true) {
    const requestAccounts =
      await chainference.account.inferenceRequestAccount.all([
        {
          memcmp: {
            offset: 8,
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ]);

    if (requestAccounts.length > 0) {
      request = requestAccounts[0]!;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  while (request.account.sendPromptTo === "") {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));

    request = {
      account: await chainference.account.inferenceRequestAccount.fetch(
        request.publicKey
      ),
      publicKey: request.publicKey,
    };
  }

  return request;
}

async function promptModel(
  chainference: anchor.Program<Chainference>,
  wallet: anchor.web3.Keypair,
  model: string,
  messages: ChatPrompt,
  max_cost: anchor.BN
) {
  console.log();
  logEphemeral("Submitting inference request to chain");

  await chainference.methods.requestInference(model, max_cost).rpc();

  logEphemeral("Waiting for request to be locked by a server");

  const request = await waitForRequestToBeLocked(chainference, wallet);

  logEphemeral("Request locked. Sending prompt");

  const signature = nacl.sign.detached(
    new TextEncoder().encode(request.publicKey.toBase58()),
    wallet.secretKey
  );

  const body = {
    messages,
    signature: Buffer.from(signature).toString("hex"),
  };

  const response = await fetch(request.account.sendPromptTo, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  logEphemeral("");

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        let response: any;
        try {
          response = JSON.parse(chunk);
        } catch (e) {
          console.error(`Unable to parse chunk into JSON: ${chunk}`);
          throw e;
        }

        if (response.done) {
          break;
        }

        controller.enqueue(response.message.content);
      }
    },
  });
}

let clearLastEphemeralLine: (() => void) | null = null;
function logEphemeral(message: string) {
  if (clearLastEphemeralLine !== null) {
    clearLastEphemeralLine();
  }

  if (message === "") {
    return;
  }

  process.stdout.write("\x1B[?25l"); // Hide cursor
  let dots = 0;
  const interval = setInterval(() => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    dots = (dots + 1) % 4;
    process.stdout.write(`${message}${".".repeat(dots)}`);
  }, 300);

  clearLastEphemeralLine = () => {
    clearInterval(interval);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write("\x1B[?25h"); // Show cursor
  };
}
