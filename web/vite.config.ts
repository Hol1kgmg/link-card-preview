import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  server: {
    // vp dev 中は wrangler dev (8787) に API を流す
    proxy: { "/api": "http://localhost:8787" },
  },
});
