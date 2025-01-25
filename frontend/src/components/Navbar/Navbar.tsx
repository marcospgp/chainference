import Wallet from "../Wallet";
import "./Navbar.css";

export default function Navbar() {
  return (
    <div className="navbar">
      <a href="/">
        <div className="navbar-logo">
          <h1>Chainference</h1>
          <h1>Chainference</h1>
          <h1>Chainference</h1>
        </div>
      </a>
      <div className="wallet">
        <Wallet />
      </div>
    </div>
  );
}
