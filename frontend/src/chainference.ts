import { type Chainference } from "../../solana/target/types/chainference";
import idl from "../../solana/target/idl/chainference.json";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { useMemo } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

const LAMPORTS_PER_SOL = 1e9;

const urlParams = new URLSearchParams(window.location.search);
const walletParam = urlParams.get("wallet");

export function useChainference(): anchor.Program<Chainference> | null {
  const adapterWallet: any = useAnchorWallet();

  return useMemo(() => {
    let wallet: any;

    if (adapterWallet) {
      wallet = adapterWallet;
    }

    if (!adapterWallet && !walletParam) {
      return null;
    }

    if (!adapterWallet && walletParam) {
      const secretKey = bs58.decode(walletParam);
      const keypair = anchor.web3.Keypair.fromSecretKey(secretKey);

      wallet = {
        publicKey: keypair.publicKey,
        signTransaction: async (tx: anchor.web3.Transaction) => {
          tx.partialSign(keypair);
          return tx;
        },
        signAllTransactions: async (txs: anchor.web3.Transaction[]) =>
          txs.map((tx) => {
            tx.partialSign(keypair);
            return tx;
          }),
      };
    }

    const connection = new anchor.web3.Connection(
      "https://api.devnet.solana.com"
    );
    const provider = new anchor.AnchorProvider(connection, wallet!, {});

    anchor.setProvider(provider);

    const chainference = new anchor.Program(idl as Chainference, provider);

    return chainference;
  }, [adapterWallet]);
}

export type InferenceRequestAccount = {
  type: "inferenceRequestAccount";
  publicKey: anchor.web3.PublicKey;
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
            publicKey: decoded.requester,
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
          publicKey: acc.account.requester,
          data: {
            requester: acc.account.requester,
            model: acc.account.model,
            maxCost: acc.account.maxCostLamports,
            lockedBy: acc.account.lockedBy,
            sendPromptTo: acc.account.sendPromptTo,
          },
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

export async function waitForRequestToBeLocked(
  chainference: anchor.Program<Chainference>,
  timeoutMs: number = 100
): Promise<InferenceRequestAccount> {
  let requestAccount;

  while (true) {
    const requestAccounts =
      await chainference.account.inferenceRequestAccount.all([
        {
          memcmp: {
            offset: 8,
            bytes: chainference.provider.publicKey!.toBase58(),
          },
        },
      ]);

    if (requestAccounts.length > 0) {
      requestAccount = requestAccounts[0]!;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  console.log(
    `Found request account on chain with address "${requestAccount.publicKey}"...`
  );

  let request: InferenceRequestAccount = {
    type: "inferenceRequestAccount",
    publicKey: requestAccount.publicKey,
    data: {
      requester: requestAccount.account.requester,
      model: requestAccount.account.model,
      maxCost: requestAccount.account.maxCostLamports,
      lockedBy: requestAccount.account.lockedBy,
      sendPromptTo: requestAccount.account.sendPromptTo,
    },
  };

  while (request.data.sendPromptTo === "") {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));

    const updatedAccount =
      await chainference.account.inferenceRequestAccount.fetch(
        requestAccount.publicKey
      );

    request = {
      type: "inferenceRequestAccount",
      publicKey: requestAccount.publicKey,
      data: {
        requester: updatedAccount.requester,
        model: updatedAccount.model,
        maxCost: updatedAccount.maxCostLamports,
        lockedBy: updatedAccount.lockedBy,
        sendPromptTo: updatedAccount.sendPromptTo,
      },
    };
  }

  return request;
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function sendPrompt(
  request: InferenceRequestAccount,
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void
): Promise<void> {
  console.log("Signing message for account:", request.publicKey.toBase58());

  // TODO: disabled signatures because anchor wallet can't sign messages.
  // const message = new TextEncoder().encode(request.publicKey.toBase58());
  // const signature = await wallet.signMessage(message);
  // signature: Buffer.from(signature).toString("hex"),

  const body = { messages };

  try {
    const response = await fetch(request.data.sendPromptTo, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (onChunk) {
        onChunk(chunk);
      }
    }
  } catch (error) {
    console.error("Network error:", error);
    throw new Error(
      `Failed to fetch: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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
