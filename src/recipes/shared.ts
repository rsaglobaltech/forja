import { defineRecipe } from "./types.js";
import { isJava } from "../config/schema.js";

export default defineRecipe({
  id: "shared",
  apply(ctx) {
    if (isJava(ctx.config)) {
      ctx.copyFile("shared-java/package.json.ejs", "packages/shared/package.json");
      ctx.copyDir("shared-java/src", "packages/shared/src");
      return;
    }
    ctx.copyFile("shared/package.json.ejs", "packages/shared/package.json");
    ctx.copyFile("shared/tsconfig.json", "packages/shared/tsconfig.json");
    ctx.copyDir("shared/src", "packages/shared/src");
  },
});
