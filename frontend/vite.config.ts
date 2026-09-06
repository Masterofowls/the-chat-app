import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      "@shared": path.resolve(dirname, "../shared"),
    },
  },
  server: {
    port: 9001,
    strictPort: true,
  },
  preview: {
    port: 9001,
  },
});
