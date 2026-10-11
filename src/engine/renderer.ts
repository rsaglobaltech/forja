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
}

export async function renderProject(config: ForjaConfig, recipes: Recipe[]): Promise<RenderResult> {
  const state: EngineState = {
    vol: createVfs(),
    config,
    templatesRoot,
    envVars: [],
  };

  for (const recipe of recipes) {
    const ctx = new RecipeContext(state);
    await recipe.apply(ctx);
  }

  vfsWrite(state.vol, ".env.example", renderEnvFile(state.envVars));

  await formatVfs(state);

  return { vol: state.vol, tree: vfsTree(state.vol) };
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
      // Templates generadas a mano pueden no ser 100% válidas para un
      // parser (p.ej. fragmentos ejs residuales); dejamos el contenido
      // crudo antes que romper la generación completa por esto.
    }
  }
}

export function writeToDisk(vol: RenderResult["vol"], targetDir: string): void {
  flushToDisk(vol, targetDir);
}
