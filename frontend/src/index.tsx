import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button, MantineProvider, Textarea, createTheme } from "@mantine/core";

import "@mantine/core/styles.css";
import "./index.css";
import { IoSendSharp } from "react-icons/io5";
import Navbar from "./components/Navbar/Navbar";
import Chat from "./components/Chat/Chat";
import ChatHistory from "./components/ChatHistory/ChatHistory";

const rootElement = document.getElementById("root");

const theme = createTheme({
  // We don't override theme variables here - we do it in the main CSS file instead,
  // using CSS variables directly.
});

const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Navbar />
      <div className="main">
        <Chat />
        <ChatHistory />
      </div>
    </MantineProvider>
  </StrictMode>
);
