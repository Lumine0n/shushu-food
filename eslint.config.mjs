import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
export default defineConfig([
  globalIgnores([".next/**", "coverage/**", "playwright-report/**"]),
  { files: ["**/*.{ts,tsx,mts,cts}"], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { "no-console": "warn", "no-unused-vars": "off" } },
]);
