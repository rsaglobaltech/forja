import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "core-hexagonal",
  apply(ctx) {
    ctx.copyFile("core-hexagonal/package.json.ejs", "packages/core/package.json");
    ctx.copyFile("core-hexagonal/tsconfig.json", "packages/core/tsconfig.json");
    ctx.copyFile("core-hexagonal/vitest.config.ts", "packages/core/vitest.config.ts");
    ctx.copyDir("core-hexagonal/src", "packages/core/src");
    // The core always carries BcryptPasswordHasher (the auth use cases live in
    // the core whatever the auth choice), so its dependency belongs here — with
    // auth "none" it used to be missing and `tsc` failed. bcryptjs 3 ships its
    // own types; @types/bcryptjs is an empty stub now.
    ctx.mergePackageJson("packages/core", { dependencies: { bcryptjs: "^3.0.3" } });

    if (ctx.has("unit")) {
      ctx.copyDir("core-hexagonal/tests/unit", "packages/core/tests/unit");
    }

    ctx.addEnv("APP_URL", "http://localhost:3000", "Base URL for password-reset links.", "app");
  },
});
