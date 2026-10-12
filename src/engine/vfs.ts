import { Volume } from "memfs";
import path from "node:path";
import fs from "node:fs";

/** In-memory writes first (spec section 7.2): nothing touches the disk until `flush`. */
export function createVfs(): InstanceType<typeof Volume> {
  return new Volume();
}

/**
 * Every path is anchored to "/" explicitly before it reaches memfs. Given a
 * relative path as-is, memfs would resolve it against its internal cwd
 * (by default the real `process.cwd()` of the process running the CLI)
 * rather than the root of the project being generated — and with a
 * `targetDir` other than `process.cwd()`, that duplicates the real path
 * inside the generated project.
 */
function toVirtualPath(filePath: string): string {
  return "/" + filePath.replace(/^\/+/, "");
}

export function vfsWrite(vol: InstanceType<typeof Volume>, filePath: string, content: string): void {
  const virtualPath = toVirtualPath(filePath);
  vol.mkdirSync(path.dirname(virtualPath), { recursive: true });
  vol.writeFileSync(virtualPath, content, { encoding: "utf-8" });
}

export function vfsRead(vol: InstanceType<typeof Volume>, filePath: string): string | undefined {
  try {
    return vol.readFileSync(toVirtualPath(filePath), "utf-8") as string;
  } catch {
    return undefined;
  }
}

export function vfsExists(vol: InstanceType<typeof Volume>, filePath: string): boolean {
  return vol.existsSync(toVirtualPath(filePath));
}

/** Flushes the whole memfs tree to the real disk under `targetDir`. */
export function flushToDisk(vol: InstanceType<typeof Volume>, targetDir: string): void {
  const files = vol.toJSON();
  for (const [virtualPath, content] of Object.entries(files)) {
    if (content === null) continue;
    const realPath = path.join(targetDir, virtualPath.replace(/^\/+/, ""));
    fs.mkdirSync(path.dirname(realPath), { recursive: true });
    fs.writeFileSync(realPath, content);
  }
}

/** The in-memory file tree, for `--dry-run` (paths relative to the project root). */
export function vfsTree(vol: InstanceType<typeof Volume>): string[] {
  return Object.keys(vol.toJSON())
    .map((p) => p.replace(/^\/+/, ""))
    .sort();
}
