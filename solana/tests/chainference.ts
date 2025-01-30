import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chainference } from "../target/types/chainference.js";
import { expect } from "chai";

const program = anchor.workspace.Chainference as Program<Chainference>;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const publicKey = provider.wallet.publicKey;
const serverOwnerKeypair = anchor.web3.Keypair.generate();

const models = [
  {
    id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
    price: new anchor.BN(400000),
  },
  {
    id: "mlx-community/Llama-3.2-3B-Instruct-8bit",
    price: new anchor.BN(800000),
  },
];

async function adjustBalance(
  keypair: anchor.web3.Keypair,
  targetBalance: number
) {
  const { connection } = provider;
  const balance = await connection.getBalance(keypair.publicKey);
  const diff = targetBalance - balance;

  if (diff !== 0) {
    const tx =
      diff > 0
        ? connection.requestAirdrop(keypair.publicKey, diff)
        : provider.sendAndConfirm(
            new anchor.web3.Transaction().add(
              anchor.web3.SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: new anchor.web3.PublicKey(
                  "1nc1nerator11111111111111111111111111111111"
                ),
                lamports: -diff,
              })
            ),
            [keypair]
          );

    await tx;
  }
}

describe("Chainference", function () {
  // Tell Mocha to be patient with our tests.
  // Otherwise test times show up in red when they're not that high for a solana app.
  this.slow(2000);

  before(async () => {
    // Make sure default wallet doesn't have too many SOL to avoid floating point inaccuracies.
    // See https://github.com/coral-xyz/anchor/issues/3524
    await adjustBalance((provider.wallet as anchor.Wallet).payer, 1e9);

    // Fund server owner wallet.
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    const sig = await provider.connection.requestAirdrop(
      serverOwnerKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction({
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  });

  it("adds a server listing", async () => {
    await program.methods
      .addServer(models)
      .accounts({
        owner: serverOwnerKeypair.publicKey,
      })
      .signers([serverOwnerKeypair])
      .rpc();

    const servers = await program.account.serverAccount.all();

    expect(servers).to.have.length(1);
    const server = servers[0];

    expect(server!.account.owner.toString()).to.equal(
      serverOwnerKeypair.publicKey.toString()
    );
    expect(server!.account.models.length).to.equal(2);
    expect(server!.account.models[0]!.id).to.equal(
      "mlx-community/Llama-3.2-3B-Instruct-4bit"
    );
    expect(server!.account.models[0]!.price.toNumber()).to.equal(
      models[0]!.price.toNumber()
    );
  });

  it("doesn't let a non-owner close a server listing", async () => {
    const randomKeypair = anchor.web3.Keypair.generate();

    const servers = await program.account.serverAccount.all();
    expect(servers).to.have.length(1);
    const server = servers[0];

    try {
      await program.methods
        .closeServer()
        .accounts({
          serverAccount: server!.publicKey,
        })
        .signers([randomKeypair])
        .rpc();

      throw null;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e).to.have.property("message").that.includes("unknown signer");
    }
  });

  it("closes the server listing we just created", async () => {
    const servers = await program.account.serverAccount.all();
    expect(servers).to.have.length(1);
    const server = servers[0];

    await program.methods
      .closeServer()
      .accountsStrict({
        serverAccount: server!.publicKey,
        owner: serverOwnerKeypair.publicKey,
      })
      .signers([serverOwnerKeypair])
      .rpc();

    try {
      await program.account.serverAccount.fetch(server!.publicKey);
      throw null;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e)
        .to.have.property("message")
        .and.include("Account does not exist");
    }
  });

  it("creates inference request", async () => {
    const model = "mlx-community/Llama-3.2-3B-Instruct-4bit";
    const maxCost = 1_000_000; // 0.01 SOL in lamports

    await program.methods.requestInference(model, new anchor.BN(maxCost)).rpc();

    const requests = await program.account.inferenceRequestAccount.all([
      {
        memcmp: {
          offset: 8, // Skip the 8-byte discriminator
          bytes: publicKey.toBase58(), // Filter by requester Pubkey
        },
      },
    ]);

    expect(requests).to.have.length(1);
    const req = requests[0];
    expect(req!.account.requester.toString()).to.equal(publicKey.toString());
    expect(req!.account.model).to.equal(model);
    expect(req!.account.maxCost.toString()).to.equal(maxCost.toString());
    expect(req!.account.sendPromptTo).to.be.a("string").that.is.empty;
    expect(req!.account.lockedBy).to.be.null;

    const lamports = (await provider.connection.getAccountInfo(req!.publicKey))!
      .lamports;

    expect(lamports).to.be.at.least(maxCost);
  });

  it("locks inference request", async () => {
    // Create server first
    await program.methods
      .addServer(models)
      .accounts({
        owner: serverOwnerKeypair.publicKey,
      })
      .signers([serverOwnerKeypair])
      .rpc();
    const servers = await program.account.serverAccount.all();
    expect(servers).to.have.length(1);
    const server = servers[0];

    const sendPromptTo = "https://example.com/some-server-endpoint";

    const requests = await program.account.inferenceRequestAccount.all();

    expect(requests).to.have.length(1);
    const requestPda = requests[0]!.publicKey;

    await program.methods
      .lockRequest(sendPromptTo)
      .accountsStrict({
        request: requestPda,
        server: server!.publicKey,
        owner: serverOwnerKeypair.publicKey,
      })
      .signers([serverOwnerKeypair])
      .rpc();

    const requestAccount = await program.account.inferenceRequestAccount.fetch(
      requestPda
    );

    expect(requestAccount!.lockedBy!.toBase58()).to.equal(
      serverOwnerKeypair.publicKey.toBase58()
    );
    expect(requestAccount.sendPromptTo).to.equal(sendPromptTo);
  });

  // it("doesn't let the same request be locked twice", async () => {
  //   // TODO
  // });

  // it("doesn't let a server without the requested model lock a request", async () => {
  //   // TODO
  // });

  it("claims payment for a locked request", async () => {
    // Fetch existing locked request
    const requests = await program.account.inferenceRequestAccount.all();
    expect(requests).to.have.length(1);
    const requestPda = requests[0]!.publicKey;

    // Fetch initial balances (Anchor should already return BN)
    const requestBefore = (await provider.connection.getAccountInfo(
      requestPda
    ))!.lamports;
    const requesterBefore = (await provider.connection.getAccountInfo(
      publicKey
    ))!.lamports;
    const ownerBefore = (await provider.connection.getAccountInfo(
      serverOwnerKeypair.publicKey
    ))!.lamports;

    const claimAmount = new anchor.BN(600_000);
    expect(requestBefore).to.be.at.least(claimAmount.toNumber());

    const tx = await program.methods
      .claimPayment(claimAmount)
      .accounts({
        request: requestPda,
        serverOwner: serverOwnerKeypair.publicKey,
      })
      .signers([serverOwnerKeypair])
      .rpc();

    // Wait for confirmation
    let txInfo = null;
    for (let i = 0; i < 100; i++) {
      txInfo = await provider.connection.getTransaction(tx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (txInfo !== null) {
        break;
      }
    }
    expect(txInfo).to.not.be.null;

    try {
      await program.account.inferenceRequestAccount.fetch(requestPda);
      throw null;
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e)
        .to.have.property("message")
        .that.includes("Account does not exist");
    }

    // Fetch balances after transaction
    const requesterAfter = (await provider.connection.getAccountInfo(
      publicKey
    ))!.lamports;
    const ownerAfter = (await provider.connection.getAccountInfo(
      serverOwnerKeypair.publicKey
    ))!.lamports;

    const fee = txInfo!.meta!.fee;
    const requesterGained = requesterAfter - requesterBefore;
    const ownerGained = ownerAfter - ownerBefore;
    const expectedRefund = requestBefore - claimAmount.toNumber() - fee;

    expect(ownerGained).to.equal(claimAmount.toNumber());
    expect(ownerGained + requesterGained + fee).to.equal(requestBefore);
    expect(requesterGained).to.be.equal(expectedRefund);
  });
});
