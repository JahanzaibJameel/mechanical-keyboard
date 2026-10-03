import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent Manager worktrees are scratch checkouts, not project source.
    // Without this every file is linted twice and each real finding is
    // reported against the worktree copy as well.
    ".kilo/**",
  ]),
]);

export default eslintConfig;
