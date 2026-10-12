#!/usr/bin/env node
/**
 * The architecture check: `npm run arch`. No dependencies, so it runs anywhere
 * the project does. Specgate runs it as `arch_cmd` in `specgate check`,
 * `specgate done` and the harness gate, before the tests.
 *
 * The rules of the hexagon in packages/core:
 *   1. the core imports no UI framework (next, react, react-native, expo);
 *   2. domain/, application/ and ports/ do not import infrastructure/.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "packages/core/src");
const UI = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](next|react|react-dom|react-native|expo)(?:\/[^"']*)?["']/;
const INFRA = /from\s+["'][./]+\/infrastructure\//;

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full) : /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const broken = [];
for (const file of files(SRC)) {
  const rel = path.relative(process.cwd(), file);
  const inner = /[\\/]src[\\/](domain|application|ports)[\\/]/.test(file);
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const ui = UI.exec(line);
      if (ui) broken.push(`${rel}:${i + 1}  imports ${ui[1]}: the core knows no UI framework`);
      else if (inner && INFRA.test(line))
        broken.push(`${rel}:${i + 1}  imports infrastructure: reach it through a port`);
    });
}

if (broken.length > 0) {
  console.error(`✖ architecture: ${broken.length} rule(s) broken\n`);
  for (const b of broken) console.error(`  ${b}`);
  console.error("\nMove that code to apps/* or infrastructure/, and reach it through a port.");
  process.exit(1);
}
console.log("✔ architecture: the core imports no UI framework, and its inner layers no infrastructure");
