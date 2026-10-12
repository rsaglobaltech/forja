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
          tailwindcss: "^4.3.3",
          "@tailwindcss/postcss": "^4.3.3",
        },
      });
    }

    if (ctx.has("mobile")) {
      ctx.copyFile("design-tailwind/apps/mobile/tailwind.config.ts", "apps/mobile/tailwind.config.ts");
      ctx.copyFile("design-tailwind/apps/mobile/global.css", "apps/mobile/global.css");
      ctx.copyFile("design-tailwind/apps/mobile/nativewind-env.d.ts", "apps/mobile/nativewind-env.d.ts");
      ctx.copyFile("design-tailwind/apps/mobile/css.d.ts", "apps/mobile/css.d.ts");
      // These override the "mobile" recipe's files: NativeWind needs its own
      // babel preset and its own Metro wrapper (see spec section 5b.3).
      ctx.copyFile("design-tailwind/apps/mobile/babel.config.js", "apps/mobile/babel.config.js");
      ctx.copyFile("design-tailwind/apps/mobile/metro.config.js", "apps/mobile/metro.config.js");
      ctx.mergePackageJson("apps/mobile", {
        dependencies: {
          nativewind: "^4.2.7",
          // NativeWind 4 animates through Reanimated; Expo 57 ships Reanimated 4,
          // which moved its worklets into their own package. Versions are the
          // ones Expo 57 bundles (bundledNativeModules.json).
          "react-native-reanimated": "4.5.1",
          "react-native-worklets": "0.10.1",
        },
        devDependencies: {
          // v3 on purpose: NativeWind 4 does not support Tailwind v4 yet.
          // It is the only accepted web/mobile mismatch (spec section 5b.1).
          tailwindcss: "^3.4.17",
        },
      });
    }
  },
});
