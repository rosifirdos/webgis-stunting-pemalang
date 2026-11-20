import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  // Absolute path for GitHub Pages sub-directory deployment
  base: "/webgis-stunting-pemalang/",
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
