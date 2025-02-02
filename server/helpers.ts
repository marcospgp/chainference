import fs from "fs";
import path from "path";
import * as anchor from "@coral-xyz/anchor";

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
  const latestBlockhash = await connection.getLatestBlockhash();

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );
}

export async function setAnchorProvider(
  wallet: anchor.web3.Keypair,
  isProd: boolean
) {
  let connection: anchor.web3.Connection;

  if (isProd) {
    console.log("Connecting to mainnet...");
    connection = new anchor.web3.Connection(
      "https://api.mainnet-beta.solana.com"
    );
  } else {
    console.log("Connecting to devnet...");
    connection = new anchor.web3.Connection("https://api.devnet.solana.com");
  }

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    {}
  );

  anchor.setProvider(provider);

  return provider;
}

export async function maybeAirdropSol(
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
