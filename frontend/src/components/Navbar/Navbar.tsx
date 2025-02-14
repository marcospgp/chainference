import "./Navbar.css";
// import { IoMenuOutline } from "react-icons/io5";
// import { Button } from "@mantine/core";

import logo from "../../assets/logo.svg" with { type: "text" };
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { memo } from "react";

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
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default memo(Navbar);
