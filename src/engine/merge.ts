export interface PackageJsonPatch {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Structured package.json merge. Each recipe is the source of truth for its
 * own deps/scripts and the order of application must not matter, so a key
 * another recipe already set to the same value is left alone, and it throws
 * if two recipes ask for different values for the same script key.
 */
export function mergePackageJson(
  current: PackageJsonShape,
  patch: PackageJsonPatch,
): PackageJsonShape {
  const result: PackageJsonShape = { ...current };

  for (const section of ["dependencies", "devDependencies"] as const) {
    if (!patch[section]) continue;
    result[section] = { ...(result[section] ?? {}), ...patch[section] };
  }

  if (patch.scripts) {
    result.scripts = { ...(result.scripts ?? {}) };
    for (const [key, value] of Object.entries(patch.scripts)) {
      const existing = result.scripts[key];
      if (existing && existing !== value) {
        throw new Error(
          `Script conflict for "${key}": "${existing}" vs "${value}". Two recipes define it differently.`,
        );
      }
      result.scripts[key] = value;
    }
  }

  for (const [key, value] of Object.entries(patch)) {
    if (key === "dependencies" || key === "devDependencies" || key === "scripts") continue;
    result[key] = value;
  }

  return result;
}

export interface EnvVar {
  key: string;
  default: string;
  comment?: string;
  section: string;
}

export function renderEnvFile(vars: EnvVar[]): string {
  const bySection = new Map<string, EnvVar[]>();
  for (const v of vars) {
    if (!bySection.has(v.section)) bySection.set(v.section, []);
    bySection.get(v.section)!.push(v);
  }

  const blocks: string[] = [];
  for (const [section, entries] of bySection) {
    const lines = [`# --- ${section} ---`];
    for (const e of entries) {
      if (e.comment) lines.push(`# ${e.comment}`);
      lines.push(`${e.key}=${e.default.includes(" ") ? JSON.stringify(e.default) : e.default}`);
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n") + "\n";
}
