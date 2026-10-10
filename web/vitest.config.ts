// Vite+ 同梱の Vitest 5 は @cloudflare/vitest-pool-workers と非互換のため、テストだけ Vitest 4 を単体で使う
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    include: ["__tests__/**/*.test.ts"],
  },
});
