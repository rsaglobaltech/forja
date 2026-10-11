import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "core-hexagonal",
  apply(ctx) {
    ctx.copyFile("core-hexagonal/package.json.ejs", "packages/core/package.json");
    ctx.copyFile("core-hexagonal/tsconfig.json", "packages/core/tsconfig.json");
    ctx.copyFile("core-hexagonal/vitest.config.ts", "packages/core/vitest.config.ts");
    ctx.copyDir("core-hexagonal/src", "packages/core/src");

    if (ctx.has("unit")) {
      ctx.copyDir("core-hexagonal/tests/unit", "packages/core/tests/unit");
    }

    ctx.addEnv("APP_URL", "http://localhost:3000", "Base de los links de recuperación de contraseña.", "app");
  },
});
