const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Expo configures a monorepo by itself (since SDK 52): it watches the
// workspace root and resolves from both node_modules folders.
const config = getDefaultConfig(__dirname);

// packages/core and packages/shared import each other's modules with a .js
// extension (ESM in Node/tsx/vitest requires it), but the files are .ts. Unlike
// webpack's resolver, Metro's does not retry with another extension when the
// import already has an explicit one — without this it throws "Unable to
// resolve module ... .js".
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    for (const ext of [".ts", ".tsx", ".js"]) {
      try {
        return context.resolveRequest(context, moduleName.slice(0, -3) + ext, platform);
      } catch {
        // try the next extension
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
