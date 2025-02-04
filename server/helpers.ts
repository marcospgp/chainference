import fs from "fs";
import path from "path";
import * as anchor from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import { PublicKey } from "@solana/web3.js";

const WALLET_PATH = path.join(__dirname, "wallet.json");

export function loadOrCreateWallet() {
  let wallet: anchor.web3.Keypair;

  if (fs.existsSync(WALLET_PATH)) {
    const secretKey = Uint8Array.from(
      JSON.parse(fs.readFileSync(WALLET_PATH, "utf8"))
    );
    wallet = anchor.web3.Keypair.fromSecretKey(secretKey);
    console.log("Loaded wallet from wallet.json:", wallet.publicKey.toBase58());
  } else {
    prompt(
      "No wallet.json file found in project folder, so a new wallet will be generated. Press enter to continue."
    );
    wallet = anchor.web3.Keypair.generate();
    fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(wallet.secretKey)));
    console.log(
      "Generated wallet and stored in wallet.json:",
      wallet.publicKey.toBase58()
    );
  }
  return wallet;
}

export async function getBalanceSol(
  publicKey: anchor.web3.PublicKey,
  connection: anchor.web3.Connection
) {
  const balance = await connection.getBalance(publicKey);
  return balance / anchor.web3.LAMPORTS_PER_SOL;
}

export async function airdropSol(
  publicKey: anchor.web3.PublicKey,
  solAmount: number,
  connection: anchor.web3.Connection
) {
  const lamports = solAmount * anchor.web3.LAMPORTS_PER_SOL;
  const signature = await connection.requestAirdrop(publicKey, lamports);

  await waitForConfirmation([signature]);
}

export async function airdropSolIfBalanceBelow(
  publicKey: anchor.web3.PublicKey,
  minBalanceSol: number,
  connection: anchor.web3.Connection
) {
  const balanceSol = await getBalanceSol(publicKey, connection);

  if (balanceSol >= minBalanceSol) {
    return;
  }

  console.log(
    `Wallet balance below ${minBalanceSol} SOL. Airdropping that amount...`
  );
  await airdropSol(publicKey, minBalanceSol, connection);

  console.log(
    `New wallet balance: ${await getBalanceSol(publicKey, connection)} SOL`
  );
}

export async function waitForConfirmation(transactions: string[]) {
  const connection = anchor.getProvider().connection;
  const latestBlockhash = await connection.getLatestBlockhash();

  await Promise.all(
    transactions.map((t) =>
      connection.confirmTransaction(
        {
          signature: t,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "finalized"
      )
    )
  );
}

export function closeServerOnExit(
  publicKey: PublicKey,
  program: anchor.Program<Chainference>
) {
  async function closeServer() {
    console.log(`\nClosing server...`);

    await program.methods
      .closeServer()
      .accounts({ serverAccount: publicKey })
      .rpc();

    process.exit(0);
  }

  process.on("SIGINT", closeServer);
  process.on("SIGTERM", closeServer);
}
