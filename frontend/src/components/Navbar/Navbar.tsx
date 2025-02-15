import "./Navbar.css";
// import { IoMenuOutline } from "react-icons/io5";
// import { Button } from "@mantine/core";

import logo from "../../assets/logo.svg" with { type: "text" };
import { BaseWalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { memo } from "react";

const LABELS = {
  'change-wallet': 'Change wallet',
  connecting: 'Connecting...',
  'copy-address': 'Copy address',
  copied: 'Copied',
  disconnect: 'Disconnect',
  'has-wallet': 'Connect wallet (devnet)',
  'no-wallet': 'Connect wallet (devnet)',
} as const;

const Navbar = () => {
  return (
    <div className="navbar">
        {/* <Button variant='default' onClick={onMenuClick}>
          <IoMenuOutline />
        </Button> */}
        <a href="/" className="navbar-logo">
          <div dangerouslySetInnerHTML={{ __html: logo }}></div>
        </a>
      <div className="wallet">
        <BaseWalletMultiButton labels={LABELS} />
      </div>
    </div>
  );
};

export default memo(Navbar);
