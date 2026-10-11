import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "shared",
  apply(ctx) {
    ctx.copyFile("shared/package.json.ejs", "packages/shared/package.json");
    ctx.copyFile("shared/tsconfig.json", "packages/shared/tsconfig.json");
    ctx.copyDir("shared/src", "packages/shared/src");
  },
});
