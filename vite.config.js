import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  // "./" keeps asset URLs relative, so dist/ works on GitHub Pages sub-paths too.
  base: "./",
  server: { open: true },
  build: {
    target: "es2020",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ["leaflet"],
          chartjs: ["chart.js"],
        },
      },
    },
  },
});
