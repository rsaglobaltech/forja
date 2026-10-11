import fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
import type { Volume } from "memfs";
import type { ForjaConfig } from "../config/schema.js";
import { vfsWrite, vfsRead } from "./vfs.js";
import { mergePackageJson, type PackageJsonPatch, type EnvVar } from "./merge.js";

export interface EngineState {
  vol: InstanceType<typeof Volume>;
  config: ForjaConfig;
  templatesRoot: string;
  envVars: EnvVar[];
  executables: Set<string>;
}

/** flags que `ctx.has()` puede resolver contra arrays del config. */
function inConfigArrays(config: ForjaConfig, flag: string): boolean {
  return (
    (config.platforms as string[]).includes(flag) ||
    (config.tests as string[]).includes(flag) ||
    (config.extras as string[]).includes(flag)
  );
}

export class RecipeContext {
  readonly config: ForjaConfig;
  private readonly state: EngineState;

  constructor(state: EngineState) {
    this.state = state;
    this.config = state.config;
  }

  has(flag: string): boolean {
    return inConfigArrays(this.config, flag);
  }

  /** Escribe un archivo tal cual, resolviendo path relativo a la raíz del proyecto generado. */
  write(destPath: string, content: string): void {
    vfsWrite(this.state.vol, destPath, content);
  }

  read(destPath: string): string | undefined {
    return vfsRead(this.state.vol, destPath);
  }

  /**
   * Copia recursiva desde `templates/<srcDir>` hacia `<destDir>` dentro del
   * proyecto generado. Archivos `*.ejs` se renderizan con `{ config, ...data }`
   * y pierden el sufijo `.ejs`; el resto se copia literal.
   */
  copyDir(
    srcDir: string,
    destDir: string,
    data: Record<string, unknown> = {},
    mapPath: (relPath: string) => string = (relPath) => relPath,
  ): void {
    const absoluteSrc = path.join(this.state.templatesRoot, srcDir);
    if (!fs.existsSync(absoluteSrc)) {
      throw new Error(`Template no encontrado: ${absoluteSrc}`);
    }
    this.copyDirRecursive(absoluteSrc, absoluteSrc, destDir, data, mapPath);
  }

  private copyDirRecursive(
    root: string,
    currentDir: string,
    destDir: string,
    data: Record<string, unknown>,
    mapPath: (relPath: string) => string,
  ): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const abs = path.join(currentDir, entry.name);
      const rel = path.relative(root, abs);

      if (entry.isDirectory()) {
        this.copyDirRecursive(root, abs, destDir, data, mapPath);
        continue;
      }

      const isEjs = entry.name.endsWith(".ejs");
      const relDest = mapPath(isEjs ? rel.slice(0, -4) : rel);
      const destPath = path.join(destDir, relDest);
      const raw = fs.readFileSync(abs, "utf-8");
      const content = isEjs ? ejs.render(raw, { config: this.config, ...data }, { filename: abs }) : raw;
      this.write(destPath, content);
    }
  }

  /** Copia un único archivo, permitiendo renombrarlo (útil para dotfiles como `gitignore` → `.gitignore`). */
  copyFile(srcRelPath: string, destPath: string, data: Record<string, unknown> = {}): void {
    const abs = path.join(this.state.templatesRoot, srcRelPath);
    const raw = fs.readFileSync(abs, "utf-8");
    const isEjs = srcRelPath.endsWith(".ejs");
    const content = isEjs ? ejs.render(raw, { config: this.config, ...data }, { filename: abs }) : raw;
    this.write(destPath, content);
  }

  mergePackageJson(pkgDir: string, patch: PackageJsonPatch): void {
    const pkgPath = path.join(pkgDir, "package.json");
    const currentRaw = this.read(pkgPath);
    const current = currentRaw ? JSON.parse(currentRaw) : {};
    const merged = mergePackageJson(current, patch);
    this.write(pkgPath, JSON.stringify(merged, null, 2) + "\n");
  }

  /** Marca un archivo como ejecutable al escribirlo a disco (p. ej. `mvnw`). */
  markExecutable(destPath: string): void {
    this.state.executables.add(destPath.replace(/^\/+/, ""));
  }

  addEnv(key: string, def: string, comment?: string, section = "otros"): void {
    this.state.envVars.push({ key, default: def, comment, section });
  }
}
