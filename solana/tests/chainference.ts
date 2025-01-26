import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chainference } from "../target/types/chainference";
import { expect } from "chai";

describe("chainference", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Chainference as Program<Chainference>;

  it("Adds a server listing", async () => {
    const server = provider.wallet.publicKey;

    // Derive PDA for the server_account
    const [serverAccountPda, _bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("server"), server.toBuffer()],
        program.programId
      );

    // We'll pick an arbitrary space. In a real app, compute carefully or cap it.
    const space = new anchor.BN(1024);

    // Price 0.0004 SOL → 0.0004 * 1_000_000_000 lamports = 400_000
    const models = [
      {
        id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
        price: new anchor.BN(400_000),
      },
    ];

    // Call the instruction
    await program.methods
      .listServer(space, models)
      .accounts({
        OKTHISPASSESWITHANYVALUEWTFservegfdgdrListingAccount: serverAccountPda,
        server,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch and verify
    const serverAccountData = await program.account.serverAccount.fetch(
      serverAccountPda
    );
    expect(serverAccountData.owner.toString()).to.equal(server.toString());
    expect(serverAccountData.models.length).to.equal(1);
    expect(serverAccountData.models[0].id).to.equal(
      "mlx-community/Llama-3.2-3B-Instruct-4bit"
    );
    expect(serverAccountData.models[0].price.toNumber()).to.equal(400000);

    console.log("serverAccountData:", serverAccountData);
  });
});
