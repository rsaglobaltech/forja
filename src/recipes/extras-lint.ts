import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";

export default defineRecipe({
  id: "extras-lint",
  apply(ctx) {
    ctx.copyFile("extras-lint/eslint.config.mjs", "eslint.config.mjs");
    ctx.copyFile("extras-lint/.prettierrc.json", ".prettierrc.json");

    // Java (v0.2, validated): ESLint 10. Node (v0.1): stays on ESLint 9 until Expo is validated with 10.
    const java = isJava(ctx.config);
    ctx.mergePackageJson(".", {
      devDependencies: {
        eslint: java ? "^10.12.0" : "^9.18.0",
        "@eslint/js": java ? "^10.0.0" : "^9.18.0",
        "typescript-eslint": java ? "^8.46.0" : "^8.19.1",
        prettier: "^3.4.2",
      },
      scripts: {
        lint: "eslint .",
      },
    });
  },
});
