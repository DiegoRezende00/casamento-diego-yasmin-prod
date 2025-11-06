import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // 🔥 essencial para funcionar no Vercel
  build: {
    outDir: "dist", // garante que o build vai pra pasta certa
  },
});
