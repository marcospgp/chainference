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

async function getRequestAccountSize(model: string) {
  type Request = anchor.IdlAccounts<Chainference>["request"];

  const fakeRequestAccount: Request = {
    requester: anchor.web3.PublicKey.default,
    model,
    maxCost: new anchor.BN(0),
    stake: anchor.web3.PublicKey.default,
    createdAt: new anchor.BN(0),
  };

  return (await program.coder.accounts.encode("request", fakeRequestAccount))
    .length;
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
  this.slow(1000);

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

  it("creates inference request", async () => {
    const createdAt = Math.floor(Date.now() / 1000);
    const model = "mlx-community/Llama-3.2-3B-Instruct-4bit";

    const [requestPda, _bump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("inference"),
          publicKey.toBuffer(),
          Buffer.from(new anchor.BN(createdAt).toArray("le", 8)),
        ],
        program.programId
      );

    const [stakePda, _bump2] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("stake"),
          publicKey.toBuffer(),
          Buffer.from(new anchor.BN(createdAt).toArray("le", 8)),
        ],
        program.programId
      );

    const requestSpace = await getRequestAccountSize(model);
    const maxCost = 1_000_000; // 0.01 SOL in lamports

    await program.methods
      .requestInference(
        new anchor.BN(requestSpace),
        new anchor.BN(createdAt),
        model,
        new anchor.BN(maxCost)
      )
      .accountsStrict({
        request: requestPda,
        stake: stakePda,
        requester: publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch the request account.
    const requestAccount = await program.account.request.fetch(requestPda);

    expect(requestAccount.requester.toString()).to.equal(publicKey.toString());
    expect(requestAccount.model).to.equal(model);
    expect(requestAccount.maxCost.toString()).to.equal(maxCost.toString());
    expect(requestAccount.stake.toString()).to.equal(stakePda.toString());
    expect(requestAccount.createdAt.toNumber()).to.equal(createdAt);

    // Verify the stake account exists
    const stakeAccount = await provider.connection.getAccountInfo(stakePda);
    expect(stakeAccount).to.not.be.null;
    expect(stakeAccount!.lamports).to.equal(
      maxCost + (await provider.connection.getMinimumBalanceForRentExemption(8))
    );
  });
});
