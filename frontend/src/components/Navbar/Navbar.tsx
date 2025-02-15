import "./Navbar.css";

import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { memo } from "react";
import { useChainference } from "../../chainference";
import { useWallet } from "@solana/wallet-adapter-react";
import { IoLogoGithub } from "react-icons/io5";
import { useDisclosure } from '@mantine/hooks';
import { Modal, ScrollArea } from '@mantine/core';
import { marked } from "marked";



import logo from "../../assets/logo.svg" with { type: "text" };

const Navbar = () => {
  const labels = {
    "change-wallet": "Change wallet",
    connecting: "Connecting...",
    "copy-address": "Copy address",
    copied: "Copied",
    disconnect: "Disconnect",
    "has-wallet": "Connect wallet (devnet)",
    "no-wallet": "Connect wallet (devnet)",
  };

  const wallet = useWallet();
  const chainference = useChainference();

  if (!wallet.connected && chainference !== null) {
    labels["no-wallet"] = `${chainference.provider
      .publicKey!.toBase58()
      .slice(0, 8)}...`;
  }

  // For the about modal
  const [opened, { open, close }] = useDisclosure(false);

  const content = `
Chainference is AI inference running on the Solana chain.

This project was built for [Andrew Tate's fundraiser.com hackathon](https://www.fundraiser.com/hackathon).

## How it works

When you submit a prompt through this website, you are creating a transaction on the solana chain.

My macbook running ollama, which has previously registered on the chain as [a server](https://github.com/marcospgp/chainference/tree/main/server), sees that transaction and locks it.

This website then sends your prompt to that server, which streams back a response.

Everything is connected to the Solana devnet, so you can send prompts without spending real money. If your devnet wallet runs out of SOL, you can request an airdrop on the [Solana faucet](https://faucet.solana.com/).

Each response from the AI ends with a link to the corresponding transaction on the Solana devnet chain.

## Vision

We see a future where people own the hardware that runs the AIs, and where others can pay for inference to be run in a free market of compute.

We don't believe in a future where large corporations rent-seek by owning all of the hardware and keeping models closed.

With Chainference, anyone with a device capable of running AI inference can register on the chain, letting others know which models they're able to run and at what price.

## Code

The code for this proof of concept has been open sourced, and more details on the technical implementation are available on the [GitHub readme](https://github.com/marcospgp/chainference#chainference).

This project includes this web client, a solana smart contract built with anchor, a server CLI, and an alternative client CLI.
  `;

  return (
    <>
    <div className="navbar">
      <a href="/" className="navbar-logo">
        <div dangerouslySetInnerHTML={{ __html: logo }}></div>
      </a>

      <div className="navbar-right">
        <a style={{ cursor: "pointer" }} onClick={open}>
          <h3>About</h3>
        </a>
        <a className="github-link" href="https://github.com/marcospgp/chainference">
          <IoLogoGithub />
        </a>

        <div className="wallet">
          <BaseWalletMultiButton labels={labels} />
        </div>
      </div>
    </div>

    <Modal
    opened={opened}
    onClose={close}
    title="About Chainference"
    size="xl"
    >
    <div
      dangerouslySetInnerHTML={{
        // @ts-expect-error
        __html: marked.parse(content, {}),
      }}
    />
    </Modal>
    </>
  );
};

export default memo(Navbar);
