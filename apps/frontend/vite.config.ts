import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ??
  `http://127.0.0.1:${process.env.API_PORT ?? process.env.PORT ?? "3001"}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [".nicotordev.com", ".up.railway.app"],
    proxy: {
      "/api": apiProxyTarget,
    },
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        chat: resolve(import.meta.dirname, "chat.html"),
      },
    },
  },
});
