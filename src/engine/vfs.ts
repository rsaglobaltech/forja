import { Volume } from "memfs";
import path from "node:path";
import fs from "node:fs";

/** Escritura en memoria primero (sección 7.2): nada toca disco hasta `flush`. */
export function createVfs(): InstanceType<typeof Volume> {
  return new Volume();
}

/**
 * Todas las rutas se anclan a "/" explícitamente antes de tocar memfs.
 * Si se le pasaran rutas relativas tal cual, memfs las resolvería contra
 * su cwd interno (que por defecto es el `process.cwd()` real del proceso
 * que corre el CLI) y no contra la raíz del proyecto que se está generando
 * — con `targetDir` distinto de `process.cwd()` eso duplica el path real
 * adentro del proyecto generado.
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

/** Vuelca el árbol completo de memfs a disco real bajo `targetDir`. */
export function flushToDisk(vol: InstanceType<typeof Volume>, targetDir: string): void {
  const files = vol.toJSON();
  for (const [virtualPath, content] of Object.entries(files)) {
    if (content === null) continue;
    const realPath = path.join(targetDir, virtualPath.replace(/^\/+/, ""));
    fs.mkdirSync(path.dirname(realPath), { recursive: true });
    fs.writeFileSync(realPath, content);
  }
}

/** Árbol de archivos en memoria, para `--dry-run` (rutas relativas a la raíz del proyecto). */
export function vfsTree(vol: InstanceType<typeof Volume>): string[] {
  return Object.keys(vol.toJSON())
    .map((p) => p.replace(/^\/+/, ""))
    .sort();
}
