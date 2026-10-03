import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Only this repository's own tests. Agent Manager worktrees under .kilo/
    // carry their own copy of the suite: collecting them duplicates every test,
    // and because the e2e exclude below is scoped to tests/e2e, it also hands
    // Playwright specs to Vitest, which aborts on test.describe().
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**/*.test.ts", ".kilo/**", "node_modules/**/*"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
