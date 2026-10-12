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
        // NODE_PATH: some Expo tools (babel-preset-expo, @expo/metro-config)
        // are installed at the monorepo root because they have a single
        // consumer, but on startup they look for sibling packages
        // (metro-core, expo-asset, etc.) that npm nested only under
        // apps/mobile — without this, Node cannot find them and `expo start`
        // fails with "Cannot find module" right away.
        mobile: 'NODE_PATH="$PWD/node_modules" npm run start --workspace apps/mobile',
      },
    });

    // Same problem, package.json "exports" edition: when something hoisted to
    // the root (e.g. babel-preset-expo) calls `require("expo/config")`, Node
    // resolves the subpath through the "exports" field of the "expo" package
    // itself — that does NOT consult NODE_PATH, so "expo" must be reachable
    // from the root. Duplicating it as a root dependency "fixes" that but
    // breaks @expo/cli's project-root detection (two real installs confuse
    // its require.resolve) — hence a symlink created in postinstall, not a
    // second real copy. See scripts/link-expo.cjs.
    ctx.copyFile("mobile/scripts/link-expo.cjs", "scripts/link-expo.cjs");
    ctx.mergePackageJson(".", {
      scripts: {
        postinstall: "node scripts/link-expo.cjs",
      },
    });

    if (ctx.has("web")) {
      // apps/web wants React 19 and apps/mobile React 18 (Expo does not
      // support 19 yet) in the same node_modules tree. Without this pin, npm
      // may end up hoisting 18 to the root, which is where Next resolves
      // React for its own internal pages (/404, /500) — the result is a
      // broken build with "React error #31" (two copies of React mixed up)
      // that has nothing to do with the app's code. Pinning here the SAME
      // version apps/web/package.json declares wins the hoist for 19 and
      // leaves apps/mobile with its own nested copy of 18 (which Metro
      // resolves fine without extra help).
      ctx.mergePackageJson(".", {
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
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
