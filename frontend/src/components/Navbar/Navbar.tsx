import "./Navbar.css";
// import { IoMenuOutline } from "react-icons/io5";
// import { Button } from "@mantine/core";

import david from "../../assets/david-v4.svg" with { type: "text" };
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { memo } from "react";

const Navbar = () => {
  return (
    <div className="navbar">
        {/* <Button variant='default' onClick={onMenuClick}>
          <IoMenuOutline />
        </Button> */}
        <a href="/" className="navbar-logo">
          <div dangerouslySetInnerHTML={{ __html: david }}></div>
          <h1>Chainference</h1>
        </a>
      <div className="wallet">
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default memo(Navbar);
