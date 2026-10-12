import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "extras-lint",
  apply(ctx) {
    ctx.copyFile("extras-lint/eslint.config.mjs", "eslint.config.mjs");
    ctx.copyFile("extras-lint/.prettierrc.json", ".prettierrc.json");

    // ESLint 10 on both paths: the config is plain TypeScript rules, with no
    // Expo or Next plugin that would pin an older ESLint.
    ctx.mergePackageJson(".", {
      devDependencies: {
        eslint: "^10.12.0",
        "@eslint/js": "^10.0.0",
        "typescript-eslint": "^8.71.1",
        prettier: "^3.6.2",
      },
      scripts: {
        lint: "eslint .",
      },
    });
  },
});
