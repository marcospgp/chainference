import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chainference } from "../target/types/chainference.js";
import { expect } from "chai";

const program = anchor.workspace.Chainference as Program<Chainference>;

async function getServerAccountSize(
  models: { id: string; price: anchor.BN }[]
) {
  type ServerAccount = anchor.IdlAccounts<Chainference>["serverAccount"];

  // Fake account just to calculate size.
  const fakeServerAccount: ServerAccount = {
    owner: anchor.web3.PublicKey.default,
    models,
    lastHeartbeat: new anchor.BN(0),
  };

  // Encode the account to calculate space.
  // Note the 8 bytes for the discriminator are automatically accounted for.
  return (
    await program.coder.accounts.encode("serverAccount", fakeServerAccount)
  ).length;
}

const models = [
  {
    id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
    price: new anchor.BN(400000), // Lamports per 1M output tokens
  },
];

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const publicKey = provider.wallet.publicKey;

describe("Chainference", function () {
  // Tell Mocha to be patient with our tests.
  // Otherwise test times show up in red when they're not that high for a solana app.
  this.slow(2000);

  let serverAccountPda: anchor.web3.PublicKey;
  let size: number;

  before(async () => {
    // Server account program derived address (PDA).
    // This is deterministic based on the given seeds, which are validated by our smart contract.
    const [pda, _bump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("server"), publicKey.toBuffer()],
      program.programId
    );
    serverAccountPda = pda;

    size = await getServerAccountSize(models);
  });

  it("adds a server listing", async () => {
    await program.methods
      .addServer(new anchor.BN(size), models)
      .accountsStrict({
        serverAccount: serverAccountPda,
        owner: publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const a = await program.account.serverAccount.fetch(serverAccountPda);

    expect(a.owner.toString()).to.equal(publicKey.toString());
    expect(a.models.length).to.equal(1);
    expect(a.models[0]!.id).to.equal(
      "mlx-community/Llama-3.2-3B-Instruct-4bit"
    );
    expect(a.models[0]!.price.toNumber()).to.equal(models[0]!.price.toNumber());
  });

  it("doesn't let a non-owner close a server listing", async () => {
    const randomKeypair = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .closeServer()
        .accountsStrict({
          serverAccount: serverAccountPda,
          owner: randomKeypair.publicKey,
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
    await program.methods
      .closeServer()
      .accountsStrict({
        serverAccount: serverAccountPda,
        owner: publicKey,
      })
      .rpc();

    try {
      await program.account.serverAccount.fetch(serverAccountPda);
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e)
        .to.have.property("message")
        .and.include("Account does not exist");
    }
  });

  // Make sure we are calculating the size correctly by checking that the transaction fails when
  // size is 1 byte too small.
  // This should fail due to transaction validation - our smart contract doesn't care and trusts
  // user input for the size, as they are the ones paying for it anyway.
  it("fails to add server listing when size is 1 byte too small", async () => {
    try {
      await program.methods
        .addServer(new anchor.BN(size - 1), models)
        .accountsStrict({
          serverAccount: serverAccountPda,
          owner: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (e) {
      expect(e).to.be.instanceOf(Error);
      expect(e)
        .to.have.property("message")
        .and.include("AccountDidNotSerialize.");
    }
  });

  it("fails to create inference request when size is 1 byte too small", async () => {
    // try {
    //   await program.methods
    //     .addServer(new anchor.BN(size - 1), models)
    //     .accountsStrict({
    //       serverAccount: serverAccountPda,
    //       owner: publicKey,
    //       systemProgram: anchor.web3.SystemProgram.programId,
    //     })
    //     .rpc();
    // } catch (e) {
    //   expect(e).to.be.instanceOf(Error);
    //   expect(e)
    //     .to.have.property("message")
    //     .and.include("AccountDidNotSerialize.");
    // }
  });

  it("creates inference request", async () => {
    const model = "mlx-community/Llama-3.2-3B-Instruct-4bit";
    const maxCost = 1_000_000; // 0.01 SOL in lamports

    await program.methods.requestInference(model, new anchor.BN(maxCost)).rpc();

    const requests = await program.account.request.all([
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

    const lamports = (await provider.connection.getAccountInfo(req!.publicKey))!
      .lamports;

    expect(lamports).to.be.at.least(maxCost);
  });
});
