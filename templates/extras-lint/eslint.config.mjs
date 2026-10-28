import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Tool configs (Metro, Babel, Tailwind/NativeWind) are CJS on purpose —
    // those ecosystems still expect `require`/`module.exports` in these
    // particular files, and it is not worth fighting.
    files: ["**/babel.config.js", "**/metro.config.js", "**/tailwind.config.ts", "**/*.cjs"],
    languageOptions: {
      globals: {
        module: "writable",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // next-env.d.ts and expo-env.d.ts are generated (Next/Expo write them
    // with triple-slash references) — not worth linting.
    ignores: [
      "**/dist/**",
      "**/target/**",
      "**/build/**",
      "**/.next/**",
      "**/.expo/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "**/expo-env.d.ts",
    ],
  },
);
