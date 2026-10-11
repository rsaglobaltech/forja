import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "web",
  apply(ctx) {
    ctx.copyFile("web/package.json.ejs", "apps/web/package.json");
    ctx.copyFile("web/tsconfig.json", "apps/web/tsconfig.json");
    ctx.copyFile("web/next.config.ts.ejs", "apps/web/next.config.ts");
    ctx.copyFile("web/app/layout.tsx.ejs", "apps/web/app/layout.tsx");
    ctx.copyFile("web/app/page.tsx.ejs", "apps/web/app/page.tsx");

    if (ctx.config.design !== "tailwind") {
      ctx.copyFile("web/app/globals.css", "apps/web/app/globals.css");
    }

    ctx.mergePackageJson(".", {
      scripts: {
        dev: "npm run dev --workspace apps/web",
        build: "npm run build --workspace apps/web",
      },
    });
  },
});
