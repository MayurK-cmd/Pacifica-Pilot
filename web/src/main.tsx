import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { WalletProviders } from "./wallet";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </React.StrictMode>,
);
