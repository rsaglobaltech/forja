import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "extras-lint",
  apply(ctx) {
    ctx.copyFile("extras-lint/eslint.config.mjs", "eslint.config.mjs");
    ctx.copyFile("extras-lint/.prettierrc.json", ".prettierrc.json");

    ctx.mergePackageJson(".", {
      devDependencies: {
        eslint: "^9.18.0",
        "@eslint/js": "^9.18.0",
        "typescript-eslint": "^8.19.1",
        prettier: "^3.4.2",
      },
      scripts: {
        lint: "eslint .",
      },
    });
  },
});
