const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// packages/core y packages/shared importan entre módulos con extensión .js
// (ESM en Node/tsx/vitest lo exige), pero los archivos son .ts. A diferencia
// del resolver de webpack, el de Metro no reintenta con otra extensión
// cuando el import ya trae una explícita — sin esto tira "Unable to resolve
// module ... .js".
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    for (const ext of [".ts", ".tsx", ".js"]) {
      try {
        return context.resolveRequest(context, moduleName.slice(0, -3) + ext, platform);
      } catch {
        // probá la siguiente extensión
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
