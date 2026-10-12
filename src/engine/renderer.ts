import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ForjaConfig } from "../config/schema.js";
import type { Recipe } from "../recipes/types.js";
import { createVfs, flushToDisk, vfsTree, vfsWrite } from "./vfs.js";
import { RecipeContext, type EngineState } from "./context.js";
import { renderEnvFile } from "./merge.js";
import prettier from "prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const templatesRoot = path.join(__dirname, "..", "..", "templates");

export interface RenderResult {
  vol: EngineState["vol"];
  tree: string[];
  executables: string[];
}

export async function renderProject(config: ForjaConfig, recipes: Recipe[]): Promise<RenderResult> {
  const state: EngineState = {
    vol: createVfs(),
    config,
    templatesRoot,
    envVars: [],
    executables: new Set(),
  };

  for (const recipe of recipes) {
    const ctx = new RecipeContext(state);
    await recipe.apply(ctx);
  }

  if (state.envVars.length > 0) vfsWrite(state.vol, ".env.example", renderEnvFile(state.envVars));

  await formatVfs(state);

  return { vol: state.vol, tree: vfsTree(state.vol), executables: [...state.executables] };
}

const PRETTIER_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md"];

async function formatVfs(state: EngineState): Promise<void> {
  const files = state.vol.toJSON();
  for (const [filePath, content] of Object.entries(files)) {
    if (content === null) continue;
    if (!PRETTIER_EXTENSIONS.some((ext) => filePath.endsWith(ext))) continue;
    try {
      const formatted = await prettier.format(content, { filepath: filePath });
      state.vol.writeFileSync(filePath, formatted, { encoding: "utf-8" });
    } catch {
      // Hand-written templates may not be 100% valid for a parser (e.g.
      // leftover ejs fragments); keep the raw content rather than fail the
      // whole generation over it.
    }
  }
}

export function writeToDisk(result: Pick<RenderResult, "vol" | "executables">, targetDir: string): void {
  flushToDisk(result.vol, targetDir);
  for (const file of result.executables) fs.chmodSync(path.join(targetDir, file), 0o755);
}
