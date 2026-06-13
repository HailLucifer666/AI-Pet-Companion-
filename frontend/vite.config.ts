/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Keep Pixi in its own async "world" chunk — loaded only when the Den
        // opens, never in the main bundle.
        manualChunks(id) {
          // The 3D stack (three + react-three) loads with the Den, never in main.
          if (
            id.includes("node_modules/three") ||
            id.includes("node_modules/@react-three") ||
            id.includes("node_modules/pixi.js") ||
            id.includes("node_modules/@pixi")
          ) {
            return "world";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8090",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
