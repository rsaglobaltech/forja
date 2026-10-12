import { defineRecipe } from "./types.js";

export default defineRecipe({
  id: "mobile",
  apply(ctx) {
    ctx.copyFile("mobile/package.json.ejs", "apps/mobile/package.json");
    ctx.copyFile("mobile/tsconfig.json", "apps/mobile/tsconfig.json");
    ctx.copyFile("mobile/babel.config.js", "apps/mobile/babel.config.js");
    ctx.copyFile("mobile/metro.config.js", "apps/mobile/metro.config.js");
    ctx.copyFile("mobile/app.config.ts.ejs", "apps/mobile/app.config.ts");
    ctx.copyFile("mobile/app/_layout.tsx", "apps/mobile/app/_layout.tsx");
    // With auth = "sessions", auth-sessions provides its own app/(app)/index.tsx
    // as the "/" route — this flat placeholder would collide with it.
    if (ctx.config.auth === "none") {
      ctx.copyFile("mobile/app/index.tsx.ejs", "apps/mobile/app/index.tsx");
    }

    ctx.mergePackageJson(".", {
      scripts: {
        mobile: "npm run start --workspace apps/mobile",
      },
    });

    if (ctx.has("web")) {
      // apps/web and apps/mobile must resolve ONE copy of React: Next resolves
      // it from the root for its own internal pages (/404, /500), and two
      // copies give "React error #31" at build time. Expo 57 pins React
      // 19.2.3, so the root, apps/web and apps/mobile all declare exactly that.
      ctx.mergePackageJson(".", {
        dependencies: {
          react: "19.2.3",
          "react-dom": "19.2.3",
        },
      });
    }

    ctx.addEnv(
      "EXPO_PUBLIC_API_URL",
      "",
      "Empty = derived from the Metro host (same machine). Set it to point at another backend.",
      "apps/mobile",
    );
  },
});
