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
    // Si auth = "sessions", auth-sessions pone su propia app/(app)/index.tsx
    // como ruta "/" — este placeholder plano colisionaría con esa ruta.
    if (ctx.config.auth === "none") {
      ctx.copyFile("mobile/app/index.tsx.ejs", "apps/mobile/app/index.tsx");
    }

    ctx.mergePackageJson(".", {
      scripts: {
        // NODE_PATH: algunas herramientas de Expo (babel-preset-expo,
        // @expo/metro-config) se instalan en la raíz del monorepo por ser
        // de un solo consumidor, pero al arrancar buscan paquetes hermanos
        // (metro-core, expo-asset, etc.) que npm dejó anidados solo debajo
        // de apps/mobile — sin esto, Node no los encuentra y `expo start`
        // tira "Cannot find module" apenas arranca.
        mobile: 'NODE_PATH="$PWD/node_modules" npm run start --workspace apps/mobile',
      },
    });

    // Mismo problema, versión "exports" de package.json: cuando algo hoisteado
    // en la raíz (ej. babel-preset-expo) hace `require("expo/config")`, Node
    // resuelve el subpath vía el campo "exports" del propio paquete "expo" —
    // eso NO consulta NODE_PATH, necesita "expo" alcanzable desde la raíz.
    // Duplicarlo como dependencia ahí "arregla" eso pero rompe la detección
    // de raíz de proyecto de @expo/cli (dos instalaciones reales confunden
    // su require.resolve) — por eso es un symlink armado en postinstall,
    // no una segunda copia real. Ver scripts/link-expo.cjs.
    ctx.copyFile("mobile/scripts/link-expo.cjs", "scripts/link-expo.cjs");
    ctx.mergePackageJson(".", {
      scripts: {
        postinstall: "node scripts/link-expo.cjs",
      },
    });

    if (ctx.has("web")) {
      // apps/web quiere React 19 y apps/mobile React 18 (Expo todavía no
      // soporta 19) en el mismo árbol de node_modules. Sin este pin acá,
      // npm puede terminar hoisteando la 18 a la raíz, y ahí es de donde
      // Next resuelve React para sus propias páginas internas (/404, /500)
      // — el resultado es un build roto con "React error #31" (dos copias
      // de React mezcladas) que no tiene nada que ver con el código de la
      // app. Fijar acá la MISMA versión que declara apps/web/package.json
      // gana el hoist para la 19 y deja a apps/mobile con su propia copia
      // anidada de la 18 (que Metro resuelve bien sin ayuda extra).
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
      "Vacío = se deduce del host de Metro (misma máquina). Setealo para apuntar a otro backend.",
      "apps/mobile",
    );
  },
});
