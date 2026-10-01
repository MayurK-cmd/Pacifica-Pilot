import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Dev proxy keeps provider keys server-side: browser calls /api/*,
// vite forwards to the local gateway (web/server). See docs/WEB.md §9.
export default defineConfig({
  // @solana/web3.js v1 expects node globals (Buffer, process). Polyfill them.
  plugins: [nodePolyfills({ globals: { Buffer: true, global: true, process: true } }), react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4174,
  },
});
