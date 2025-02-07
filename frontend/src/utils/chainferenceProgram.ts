import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { type Chainference } from "../../../solana/target/types/chainference";

const LAMPORTS_PER_SOL = 1000000000;

export type InferenceRequestAccount = {
  type: "inferenceRequestAccount";
  data: {
    requester: anchor.web3.PublicKey;
    model: string;
    maxCost: anchor.BN;
    lockedBy: anchor.web3.PublicKey | null;
    sendPromptTo: string;
  };
};

export type ModelListing = {
  id: string;
  price: anchor.BN;
};

export type ServerAccount = {
  type: "serverAccount";
  data: {
    owner: anchor.web3.PublicKey;
    models: ModelListing[];
    lastHeartbeat: anchor.BN;
  };
};

export type DecodedAccount = InferenceRequestAccount | ServerAccount;

export async function decodeAccount(
  program: Program<Chainference>,
  accountInfo: Buffer,
  walletPublicKey: anchor.web3.PublicKey | undefined | null
): Promise<DecodedAccount | null> {
  // Try each account type without letting errors stop the flow
  try {
    // Try server account
    try {
      if (program.coder.accounts.memcmp("serverAccount", accountInfo)) {
        const decoded = program.coder.accounts.decode(
          "serverAccount",
          accountInfo
        );
        return {
          type: "serverAccount",
          data: decoded,
        };
      }
    } catch (e) {
      // Silently continue to next account type
    }

    // Try inference request account
    try {
      if (
        program.coder.accounts.memcmp("inferenceRequestAccount", accountInfo)
      ) {
        const decoded = program.coder.accounts.decode(
          "inferenceRequestAccount",
          accountInfo
        );
        // Only include if owned by current wallet
        if (walletPublicKey && decoded.requester.equals(walletPublicKey)) {
          return {
            type: "inferenceRequestAccount",
            data: decoded,
          };
        }
      }
    } catch (e) {
      // Silently continue
    }

    return null;
  } catch (e) {
    console.error("Failed to decode account:", e);
    return null;
  }
}

export async function fetchInitialAccounts(program: Program<Chainference>) {
  try {
    const walletPublicKey = program.provider.publicKey;

    // Fetch inference requests for current wallet
    const inferenceRequests = await program.account.inferenceRequestAccount.all(
      [
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: walletPublicKey?.toBase58() ?? "",
          },
        },
      ]
    );

    // Fetch all server accounts
    const serverAccounts = await program.account.serverAccount.all();

    // Combine and format accounts
    const formattedAccounts: DecodedAccount[] = [
      ...inferenceRequests.map(
        (acc): InferenceRequestAccount => ({
          type: "inferenceRequestAccount",
          data: acc.account,
        })
      ),
      ...serverAccounts.map(
        (acc): ServerAccount => ({
          type: "serverAccount",
          data: {
            owner: acc.account.owner,
            models: acc.account.models,
            lastHeartbeat: acc.account.lastHeartbeat,
          },
        })
      ),
    ];

    console.log("formattedAccounts", formattedAccounts);

    return formattedAccounts;
  } catch (error: any) {
    console.error("Failed to fetch initial accounts:", error);
    throw error;
  }
}

export async function createInferenceRequest(
  program: Program<Chainference>,
  model: string,
  maxCost: number
) {
  try {
    const txSignature = await program.methods
      .requestInference(model, new anchor.BN(maxCost * LAMPORTS_PER_SOL))
      .rpc();

    console.log("Created inference request:", txSignature);

    return {
      txSignature,
    };
  } catch (err) {
    console.error("Error creating inference request:", err);
    throw err;
  }
}

export async function cancelInferenceRequest(program: Program<Chainference>) {
  try {
    const txSignature = await program.methods.cancelRequest().rpc();

    console.log("Cancelled inference request:", txSignature);

    return {
      txSignature,
    };
  } catch (err) {
    console.error("Error cancelling inference request:", err);
    throw err;
  }
}
