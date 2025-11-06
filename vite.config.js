import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "src", // 👈 define a raiz do projeto como src
  base: "./",
  build: {
    outDir: "../dist", // 👈 dist vai ser gerado fora da pasta src
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
