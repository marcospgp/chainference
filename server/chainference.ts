import type { Chainference } from "../solana/target/types/chainference";
import idl from "../solana/target/idl/chainference.json";
import * as anchor from "@coral-xyz/anchor";

export async function loadChainference(
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

  const chainference = new anchor.Program(idl as Chainference, provider);

  chainference.provider;

  return chainference;
}
