import "./Navbar.css";

import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { memo } from "react";
import { useChainference } from "../../chainference";
import { useWallet } from "@solana/wallet-adapter-react";
import { IoLogoGithub } from "react-icons/io5";

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

  return (
    <div className="navbar">
      <a href="/" className="navbar-logo">
        <div dangerouslySetInnerHTML={{ __html: logo }}></div>
      </a>

      <div className="navbar-right">
        <a className="github-link" href="https://github.com/marcospgp/chainference">
          <IoLogoGithub />
        </a>

        <div className="wallet">
          <BaseWalletMultiButton labels={labels} />
        </div>
      </div>
    </div>
  );
};

export default memo(Navbar);
