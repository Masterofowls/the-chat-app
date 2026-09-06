import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { usePwaRegister } from "./lib/pwa";
import { ThemeProvider } from "./lib/theme";
import "./styles/global.css";

function Root() {
  usePwaRegister();
  return (
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root is missing");
}

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
