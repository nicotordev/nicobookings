import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: [".nicotordev.com", ".up.railway.app"],
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  preview: {
    host: true,
    port: 5174,
    strictPort: true,
  },
});
