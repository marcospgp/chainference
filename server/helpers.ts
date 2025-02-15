import fs from "fs";
import path from "path";
import * as anchor from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import { PublicKey } from "@solana/web3.js";

export function loadOrCreateWallet(filename: string = "wallet.json") {
  let wallet: anchor.web3.Keypair;
  const wallet_path = path.join(__dirname, filename);

  if (fs.existsSync(wallet_path)) {
    const secretKey = Uint8Array.from(
      JSON.parse(fs.readFileSync(wallet_path, "utf8"))
    );
    wallet = anchor.web3.Keypair.fromSecretKey(secretKey);
    console.log(
      `Loaded wallet from file "${wallet_path}": ${wallet.publicKey.toBase58()}`
    );
  } else {
    prompt(
      `Could not find wallet file "${wallet_path}", so one will be generated. Press enter to continue.`
    );
    wallet = anchor.web3.Keypair.generate();
    fs.writeFileSync(wallet_path, JSON.stringify(Array.from(wallet.secretKey)));
    console.log(
      `Generated wallet at "${wallet_path}":`,
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

async function airdropSol(
  publicKey: anchor.web3.PublicKey,
  solAmount: number,
  connection: anchor.web3.Connection
) {
  const lamports = solAmount * anchor.web3.LAMPORTS_PER_SOL;
  const signature = await connection.requestAirdrop(publicKey, lamports);

  await waitForConfirmation(signature);
}

export async function airdropIfBalanceBelowSol(
  publicKey: anchor.web3.PublicKey,
  minBalanceSol: number,
  connection: anchor.web3.Connection
) {
  const balanceSol = await getBalanceSol(publicKey, connection);

  if (balanceSol >= minBalanceSol) {
    return;
  }

  console.log(
    `Wallet balance below ${minBalanceSol} SOL. Airdropping double that amount...`
  );
  await airdropSol(publicKey, minBalanceSol * 2, connection);

  console.log(
    `New wallet balance: ${await getBalanceSol(publicKey, connection)} SOL`
  );
}

export async function waitForConfirmation(...transactions: string[]) {
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
  let exiting = false;

  async function closeServer() {
    if (exiting) {
      // Force exit immediately on second attempt.
      process.exit(1);
    }

    exiting = true;
    console.log(`\nClosing server...`);

    try {
      const transaction = await program.methods
        .closeServer()
        .accounts({ serverAccount: publicKey })
        .rpc();

      await waitForConfirmation(transaction);
    } catch (error) {
      console.error("Error closing server:", error);
    } finally {
      process.exit(0);
    }
  }

  process.on("SIGINT", closeServer);
  process.on("SIGTERM", closeServer);
}
