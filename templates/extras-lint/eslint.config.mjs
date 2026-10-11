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
    // Configs de herramientas (Metro, Babel, Tailwind/NativeWind) son CJS a
    // propósito — esos ecosistemas todavía esperan `require`/`module.exports`
    // en estos archivos puntuales, no vale la pena pelearla.
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
    // next-env.d.ts y expo-env.d.ts son generados (Next/Expo los escriben
    // solos con referencias triple-slash) — no vale la pena lintearlos.
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "**/expo-env.d.ts",
    ],
  },
);
