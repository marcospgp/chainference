import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chainference } from "../target/types/chainference.js";
import { expect } from "chai";

const program = anchor.workspace.Chainference as Program<Chainference>;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const publicKey = provider.wallet.publicKey;

const models = [
  {
    id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
    price: new anchor.BN(400000), // Lamports per 1M output tokens
  },
  {
    id: "mlx-community/Llama-3.2-3B-Instruct-8bit",
    price: new anchor.BN(800000), // Lamports per 1M output tokens
  },
];

describe("Chainference", function () {
  // Tell Mocha to be patient with our tests.
  // Otherwise test times show up in red when they're not that high for a solana app.
  this.slow(2000);

  it("adds a server listing", async () => {
    await program.methods.addServer(models).rpc();

    const servers = await program.account.serverAccount.all();

    expect(servers).to.have.length(1);
    const server = servers[0];

    expect(server!.account.owner.toString()).to.equal(publicKey.toString());
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
      console.log(e);
      expect(e).to.be.instanceOf(Error);
      expect(e).to.not.be.null;
    }
  });

  it("closes the server listing we just created", async () => {
    const servers = await program.account.serverAccount.all();
    expect(servers).to.have.length(1);
    const server = servers[0];

    await program.methods
      .closeServer()
      .accounts({
        serverAccount: server!.publicKey,
      })
      .rpc();

    try {
      await program.account.serverAccount.fetch(server!.publicKey);
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
    await program.methods.addServer(models).rpc();
    const servers = await program.account.serverAccount.all();
    expect(servers).to.have.length(1);
    const server = servers[0];

    const sendPromptTo = "https://example.com/some-server-endpoint";

    const requests = await program.account.inferenceRequestAccount.all();

    expect(requests).to.have.length(1);
    const requestPda = requests[0]!.publicKey;

    await program.methods
      .lockRequest(sendPromptTo)
      .accounts({
        request: requestPda,
        server: server!.publicKey,
      })
      .rpc();

    const requestAccount = await program.account.inferenceRequestAccount.fetch(
      requestPda
    );

    expect(requestAccount!.lockedBy!.toBase58()).to.equal(publicKey.toBase58());
    expect(requestAccount.sendPromptTo).to.equal(sendPromptTo);
  });

  it("doesn't let the same request be locked twice", async () => {
    // TODO
  });

  it("doesn't let a server without the requested model lock a request", async () => {
    // TODO
  });
});
