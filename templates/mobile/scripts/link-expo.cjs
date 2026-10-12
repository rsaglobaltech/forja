#!/usr/bin/env node
/**
 * apps/mobile is the only consumer of "expo", so npm leaves it nested
 * there — exactly what @expo/cli needs to detect the project root. The
 * problem is that other Expo tools that DO get hoisted to the root
 * (babel-preset-expo, for example) call `require("expo/config")` from their
 * own location, and that subpath resolution (via expo's "exports" field)
 * finds nothing because there is no "expo" next to them.
 *
 * Duplicating "expo" as a root dependency "fixes" that, but breaks
 * @expo/cli's project-root detection (two real installs confuse its
 * `require.resolve`). The real fix is for both places to share the SAME
 * install: a symlink, not a copy.
 *
 * Runs automatically, on its own, in npm's `postinstall` hook.
 */
const fs = require("node:fs");
const path = require("node:path");

// babel-preset-expo also decides whether to add its expo-router plugin by
// calling `require.resolve("expo-router")` from its own location
// (section 5c: "hasModule('expo-router')") — if that fails, the plugin is
// never added, and `process.env.EXPO_ROUTER_APP_ROOT` is not inlined at
// build time (Metro error when parsing `require.context(...)`).
const packages = ["expo", "expo-router"];

for (const name of packages) {
  const target = path.resolve(__dirname, "..", "apps", "mobile", "node_modules", name);
  const linkPath = path.resolve(__dirname, "..", "node_modules", name);

  if (!fs.existsSync(target)) continue;
  if (fs.existsSync(linkPath)) continue;

  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(path.relative(path.dirname(linkPath), target), linkPath, "dir");
  console.log(`[forja] node_modules/${name} -> apps/mobile/node_modules/${name} (symlink)`);
}
