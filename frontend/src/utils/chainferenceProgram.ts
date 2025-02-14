import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { type Chainference } from '../../../solana/target/types/chainference';
import * as nacl from 'tweetnacl';

const LAMPORTS_PER_SOL = 1000000000;

export type InferenceRequestAccount = {
  type: 'inferenceRequestAccount';
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
  type: 'serverAccount';
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
      if (program.coder.accounts.memcmp('serverAccount', accountInfo)) {
        const decoded = program.coder.accounts.decode(
          'serverAccount',
          accountInfo
        );
        return {
          type: 'serverAccount',
          data: decoded,
        };
      }
    } catch (e) {
      // Silently continue to next account type
    }

    // Try inference request account
    try {
      if (
        program.coder.accounts.memcmp('inferenceRequestAccount', accountInfo)
      ) {
        const decoded = program.coder.accounts.decode(
          'inferenceRequestAccount',
          accountInfo
        );
        // Only include if owned by current wallet
        if (walletPublicKey && decoded.requester.equals(walletPublicKey)) {
          return {
            type: 'inferenceRequestAccount',
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
    console.error('Failed to decode account:', e);
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
            bytes: walletPublicKey?.toBase58() ?? '',
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
          type: 'inferenceRequestAccount',
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
          type: 'serverAccount',
          data: {
            owner: acc.account.owner,
            models: acc.account.models,
            lastHeartbeat: acc.account.lastHeartbeat,
          },
        })
      ),
    ];

    console.log('formattedAccounts', formattedAccounts);

    return formattedAccounts;
  } catch (error: any) {
    console.error('Failed to fetch initial accounts:', error);
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

    console.log('Created inference request:', txSignature);

    return {
      txSignature,
    };
  } catch (err) {
    console.error('Error creating inference request:', err);
    throw err;
  }
}

export async function waitForRequestToBeLocked(
  chainference: anchor.Program<Chainference>,
  wallet: { publicKey: anchor.web3.PublicKey | null },
  timeoutMs: number = 100
): Promise<InferenceRequestAccount> {
  if (!wallet.publicKey) {
    throw new Error('Wallet public key is required');
  }

  let requestAccount;

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
      requestAccount = requestAccounts[0]!;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  }

  console.log(
    `Found request account on chain with address "${requestAccount.publicKey}"...`
  );

  let request: InferenceRequestAccount = {
    type: 'inferenceRequestAccount',
    publicKey: requestAccount.publicKey,
    data: {
      requester: requestAccount.account.requester,
      model: requestAccount.account.model,
      maxCost: requestAccount.account.maxCostLamports,
      lockedBy: requestAccount.account.lockedBy,
      sendPromptTo: requestAccount.account.sendPromptTo,
    },
  };

  while (request.data.sendPromptTo === '') {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));

    const updatedAccount =
      await chainference.account.inferenceRequestAccount.fetch(
        requestAccount.publicKey
      );

    request = {
      type: 'inferenceRequestAccount',
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
  role: 'user' | 'assistant';
  content: string;
};

export async function sendPrompt(
  request: InferenceRequestAccount,
  wallet: {
    signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
    publicKey: anchor.web3.PublicKey | null;
  },
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void
): Promise<void> {
  if (!wallet.signMessage) {
    throw new Error('Wallet must support message signing');
  }

  if (!wallet.publicKey) {
    throw new Error('Wallet public key is required');
  }

  console.log('Signing message for account:', request.publicKey.toBase58());
  const message = new TextEncoder().encode(request.publicKey.toBase58());
  const signature = await wallet.signMessage(message);
  console.log('Message signed successfully');

  console.log('Messages:', messages);

  const body = {
    messages,
    signature: Buffer.from(signature).toString('hex'),
  };

  console.log('Sending request to:', request.data.sendPromptTo);
  console.log('Request body:', JSON.stringify(body));

  try {
    const response = await fetch(request.data.sendPromptTo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      console.log('Received chunk:', chunk);
      if (onChunk) {
        onChunk(chunk);
      }
    }
  } catch (error) {
    console.error('Network error:', error);
    throw new Error(
      `Failed to fetch: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export async function cancelInferenceRequest(program: Program<Chainference>) {
  try {
    const txSignature = await program.methods.cancelRequest().rpc();

    console.log('Cancelled inference request:', txSignature);

    return {
      txSignature,
    };
  } catch (err) {
    console.error('Error cancelling inference request:', err);
    throw err;
  }
}
