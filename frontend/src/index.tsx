import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";

import "@mantine/core/styles.css";
import "./index.css";

const rootElement = document.getElementById("root");

const theme = createTheme({
  // We don't override theme variables here - we do it in the main CSS file instead,
  // using CSS variables directly.
});

const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div className="navbar">
        <a href="/">
          <div className="navbar-logo">
            <h1>Chainference</h1>
            <h1>Chainference</h1>
            <h1>Chainference</h1>
          </div>
        </a>
      </div>
    </MantineProvider>
  </StrictMode>
);
