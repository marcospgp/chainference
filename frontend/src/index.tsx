import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import "@mantine/core/styles.css";
import "./index.css";
import Navbar from "./components/Navbar/Navbar";
import Chat from "./components/Chat/Chat";
import ChatHistory from "./components/ChatHistory/ChatHistory";
import { Wallet } from "./components/Wallet";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import type { Chainference } from "../../solana/target/types/chainference";
import idl from "../../solana/target/idl/chainference.json";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";

const App = () => {
  const [opened, { close }] = useDisclosure(false);

  // TODO: use the wallet proxy here
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  setProvider(new AnchorProvider(connection, wallet!, {}));

  const program = new Program(idl as Chainference) as Program<Chainference>;

  return (
    <MantineProvider theme={createTheme({})} defaultColorScheme="dark">
      <Navbar />
      <div className="main">
        <div className="chat-container">
          <ChatHistory opened={opened} onClose={close} />
          <Chat program={program} />
        </div>
      </div>
    </MantineProvider>
  );
};

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <Wallet>
      <App />
    </Wallet>
  </StrictMode>
);
