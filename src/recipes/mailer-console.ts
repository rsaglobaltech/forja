import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "mailer-console",
  apply(ctx) {
    ctx.copyDir("mailer-console/packages/core/src", "packages/core/src");
  },
});
