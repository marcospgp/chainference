import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { type Chainference } from '../../../solana/target/types/chainference';

const LAMPORTS_PER_SOL = 1000000000;

export async function createInferenceRequest(
  program: Program<Chainference>,
  model: string,
  maxCost: number
) {
  try {
    const txSignature = await program.methods
      .requestInference(model, new anchor.BN(maxCost * LAMPORTS_PER_SOL))
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

// todo
