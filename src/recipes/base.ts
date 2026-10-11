import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "base",
  apply(ctx) {
    ctx.copyFile("base/gitignore", ".gitignore");
    ctx.copyFile("base/.editorconfig", ".editorconfig");
    ctx.copyFile("base/tsconfig.base.json", "tsconfig.base.json");
    ctx.copyFile("base/README.md.ejs", "README.md");
    ctx.copyFile("base/docs/architecture.md.ejs", "docs/architecture.md");

    ctx.mergePackageJson(".", {
      name: ctx.config.name,
      private: true,
      version: "0.1.0",
      workspaces: ["apps/*", "packages/*"],
      scripts: {
        test: "npm run test --workspaces --if-present",
        typecheck: "npm run typecheck --workspaces --if-present",
      },
    });

    ctx.write(
      "forja.config.json",
      JSON.stringify(
        { $schema: "https://forja.dev/schema.json", version: 1, ...ctx.config },
        null,
        2,
      ) + "\n",
    );
  },
});
