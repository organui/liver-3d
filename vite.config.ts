import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("/three/") || id.includes("/@react-three/")
            ? "three"
            : undefined,
      },
    },
  },
});
