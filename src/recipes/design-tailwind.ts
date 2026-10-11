import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "design-tailwind",
  apply(ctx) {
    ctx.copyDir("design-tailwind/packages/shared/src", "packages/shared/src");

    if (ctx.has("web")) {
      ctx.copyFile("design-tailwind/apps/web/app/globals.css", "apps/web/app/globals.css");
      ctx.copyFile("design-tailwind/apps/web/postcss.config.mjs", "apps/web/postcss.config.mjs");
      ctx.mergePackageJson("apps/web", {
        devDependencies: {
          tailwindcss: "^4.0.0",
          "@tailwindcss/postcss": "^4.0.0",
        },
      });
    }

    if (ctx.has("mobile")) {
      ctx.copyFile("design-tailwind/apps/mobile/tailwind.config.ts", "apps/mobile/tailwind.config.ts");
      ctx.copyFile("design-tailwind/apps/mobile/global.css", "apps/mobile/global.css");
      ctx.copyFile("design-tailwind/apps/mobile/nativewind-env.d.ts", "apps/mobile/nativewind-env.d.ts");
      // Pisan los del recipe "mobile": NativeWind necesita su propio preset
      // de babel y su propio wrapper de Metro (ver sección 5b.3 del spec).
      ctx.copyFile("design-tailwind/apps/mobile/babel.config.js", "apps/mobile/babel.config.js");
      ctx.copyFile("design-tailwind/apps/mobile/metro.config.js", "apps/mobile/metro.config.js");
      ctx.mergePackageJson("apps/mobile", {
        dependencies: {
          nativewind: "^4.2.0",
        },
        devDependencies: {
          // v3 a propósito: NativeWind 4 no soporta Tailwind v4 todavía.
          // Es la única desalineación web/móvil aceptada (spec sección 5b.1).
          tailwindcss: "^3.4.17",
        },
      });
    }
  },
});
