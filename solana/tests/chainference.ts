import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chainference } from "../target/types/chainference";
import { expect } from "chai";

const program = anchor.workspace.Chainference as Program<Chainference>;

// PDA means program derived address.
async function createServerAccountPda(key: anchor.web3.PublicKey) {
  const [serverAccountPda, _bump] =
    await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("server"), key.toBuffer()],
      program.programId
    );

  return serverAccountPda;
}

async function getServerAccountSize(
  models: { id: string; price: anchor.BN }[]
) {
  type ServerAccount = anchor.IdlAccounts<Chainference>["serverAccount"];

  // Fake account just to calculate size.
  const serverAccount: ServerAccount = {
    owner: anchor.web3.PublicKey.default,
    models,
    lastHeartbeat: new anchor.BN(0),
  };

  // Encode the account to calculate space
  const encoded = await program.coder.accounts.encode(
    "serverAccount",
    serverAccount
  );
  // 8 bytes for discriminator
  const size = 8 + encoded.length;

  return size;
}

describe("chainference", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("Adds a server listing", async () => {
    const models = [
      {
        id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
        price: new anchor.BN(400000), // Lamports per 1M output tokens
      },
    ];

    const size = await getServerAccountSize(models);

    const pda1 = await createServerAccountPda(provider.wallet.publicKey);

    await program.methods
      .addServerListing(new anchor.BN(size), models)
      .accountsStrict({
        serverListing: pda1,
        owner: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch and verify
    const serverAccountData = await program.account.serverAccount.fetch(pda1);
    expect(serverAccountData.owner.toString()).to.equal(
      provider.wallet.publicKey.toString()
    );
    expect(serverAccountData.models.length).to.equal(1);
    expect(serverAccountData.models[0]!.id).to.equal(
      "mlx-community/Llama-3.2-3B-Instruct-4bit"
    );
    expect(serverAccountData.models[0]!.price.toNumber()).to.equal(
      models[0]!.price.toNumber()
    );

    // Make sure we are calculating the size correctly by checking that a size 1 byte smaller
    // errors.
  });
});
