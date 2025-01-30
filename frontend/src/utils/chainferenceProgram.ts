import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { type Chainference } from '../../../solana/target/types/chainference';

export async function createInferenceRequest(program: Program<Chainference>) {
  const model = 'mlx-community/Llama-3.2-3B-Instruct-4bit';
  const maxCost = 1_000_000; // 0.01 SOL in lamports

  try {
    const txSignature = await program.methods
      .requestInference(model, new anchor.BN(maxCost))
      .rpc();

    console.log('Created inference request:', txSignature);

    return {
      txSignature,
    };
  } catch (err) {
    console.error('Error creating inference request:', err);
    throw err;
  }
}
