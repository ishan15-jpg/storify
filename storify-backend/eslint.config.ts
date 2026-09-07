import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: { js, tseslint },
    extends: ["js/recommended", "tseslint/recommended"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module"
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "error",
        }
      ]
    },
  }
]);
