import Wallet from "../Wallet";
import "./Navbar.css";
// import { IoMenuOutline } from "react-icons/io5";
// import { Button } from "@mantine/core";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="navbar">
      <div className="navbar-left">
        {/* <Button variant='default' onClick={onMenuClick}>
          <IoMenuOutline />
        </Button> */}
        <a href="/">
          <div className="navbar-logo">
            <h1>Chainference</h1>
            <h1>Chainference</h1>
            <h1>Chainference</h1>
          </div>
        </a>
      </div>
      <div className="wallet">
        <Wallet />
      </div>
    </div>
  );
}
