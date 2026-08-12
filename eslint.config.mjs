import { defineConfig, globalIgnores } from "eslint/config";
import measureTwice from "@measure-twice/react/eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  measureTwice.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    ".corepack/**",
    ".pnpm-store/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
