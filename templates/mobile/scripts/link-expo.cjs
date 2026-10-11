#!/usr/bin/env node
/**
 * apps/mobile es el único consumidor de "expo", así que npm lo deja
 * anidado ahí — perfecto para que @expo/cli detecte bien la raíz del
 * proyecto. El problema es que otras herramientas de Expo que SÍ quedan
 * hoisteadas en la raíz (babel-preset-expo, por ejemplo) hacen
 * `require("expo/config")` desde su propia ubicación, y esa resolución de
 * subpath (via el campo "exports" de expo) no encuentra nada porque no hay
 * ningún "expo" al lado.
 *
 * Duplicar "expo" como dependencia en la raíz "arregla" eso, pero rompe la
 * detección de raíz de proyecto de @expo/cli (dos instalaciones reales
 * confunden su `require.resolve`). La solución real es que sea la MISMA
 * instalación en los dos lugares: un symlink, no una copia.
 *
 * Corre solo, automático, en el hook `postinstall` de npm.
 */
const fs = require("node:fs");
const path = require("node:path");

// babel-preset-expo también decide si mete su plugin de expo-router
// haciendo `require.resolve("expo-router")` desde su propia ubicación
// (sección 5c: "hasModule('expo-router')") — si falla, el plugin ni se
// agrega, y `process.env.EXPO_ROUTER_APP_ROOT` queda sin inlinear en
// tiempo de build (error de Metro al parsear `require.context(...)`).
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
