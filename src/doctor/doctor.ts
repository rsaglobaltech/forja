import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import { isJava } from "../config/schema.js";
import type { Project } from "../project/project.js";

export type CheckState = "ok" | "warn" | "fail";

export interface Check {
  name: string;
  state: CheckState;
  detail: string;
  /** The command or edit that fixes it. */
  fix?: string;
}

/** The outside world doctor asks about; swapped in tests. */
export interface Probe {
  nodeVersion: string;
  run(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; stdout: string }>;
}

export const realProbe: Probe = {
  nodeVersion: process.versions.node,
  async run(cmd, args, cwd) {
    const r = await execa(cmd, args, { cwd, reject: false, timeout: 15_000 });
    return { ok: r.exitCode === 0, stdout: `${r.stdout}\n${r.stderr}` };
  },
};

const MIN_NODE = 22;
const MIN_JAVA = 21;

export async function doctor(project: Project, probe: Probe = realProbe): Promise<Check[]> {
  const { root, config } = project;
  const java = isJava(config);
  const checks: Check[] = [];

  const major = Number(probe.nodeVersion.split(".")[0]);
  checks.push(
    major >= MIN_NODE
      ? { name: "Node.js", state: "ok", detail: `v${probe.nodeVersion}` }
      : {
          name: "Node.js",
          state: "fail",
          detail: `v${probe.nodeVersion}; the project needs ${MIN_NODE} or newer`,
          fix: `Install Node.js ${MIN_NODE} LTS (e.g. \`nvm install ${MIN_NODE}\`)`,
        },
  );

  const pm = await probe.run(config.pm, ["--version"], root);
  checks.push(
    pm.ok
      ? { name: config.pm, state: "ok", detail: `v${pm.stdout.trim().split("\n")[0]}` }
      : { name: config.pm, state: "fail", detail: "not found", fix: `Install ${config.pm}, the package manager this project uses` },
  );

  if (java) {
    const v = await probe.run("java", ["-version"], root);
    const found = Number(/version "(\d+)/.exec(v.stdout)?.[1] ?? 0);
    checks.push(
      !v.ok
        ? { name: "Java", state: "fail", detail: "not found", fix: `Install a JDK ${MIN_JAVA} or newer (e.g. Temurin)` }
        : found >= MIN_JAVA
          ? { name: "Java", state: "ok", detail: `JDK ${found}` }
          : { name: "Java", state: "fail", detail: `JDK ${found}; the API needs ${MIN_JAVA}`, fix: `Install a JDK ${MIN_JAVA} or newer` },
    );
  }

  const needsDocker = config.db === "postgres-docker" || config.auth === "oauth2" || (java && config.tests.includes("integration"));
  if (needsDocker) {
    const d = await probe.run("docker", ["info", "--format", "{{.ServerVersion}}"], root);
    checks.push(
      d.ok
        ? { name: "Docker", state: "ok", detail: `engine ${d.stdout.trim().split("\n")[0]}` }
        : {
            name: "Docker",
            state: "fail",
            detail: "not running",
            fix: "Start Docker Desktop: the database" + (java ? ", Keycloak and Testcontainers" : "") + " run in it",
          },
    );
  }

  checks.push(...envChecks(root));
  if (!java) checks.push(...reactCheck(root), coreImportCheck(root));
  if (config.extras.includes("specgate")) checks.push(specgateCheck(project));

  return checks;
}

/** Every key a .env.example declares must be in the .env (or .env.local) beside it. */
export function envChecks(root: string): Check[] {
  const checks: Check[] = [];
  for (const example of findFiles(root, (f) => path.basename(f) === ".env.example")) {
    const dir = path.dirname(example);
    const rel = path.relative(root, dir) || ".";
    const local = [".env", ".env.local"].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
    const name = `env (${rel === "." ? "root" : rel})`;
    if (!local) {
      checks.push({
        name,
        state: "warn",
        detail: "no .env yet: the defaults in the code apply",
        fix: `cp ${path.join(rel, ".env.example")} ${path.join(rel, ".env")}`,
      });
      continue;
    }
    const missing = [...keys(example)].filter((k) => !keys(local).has(k));
    checks.push(
      missing.length === 0
        ? { name, state: "ok", detail: `${path.basename(local)} has every key of .env.example` }
        : {
            name,
            state: "warn",
            detail: `${path.basename(local)} lacks ${missing.join(", ")}`,
            fix: `Copy ${missing.length === 1 ? "that line" : "those lines"} from ${path.join(rel, ".env.example")}`,
          },
    );
  }
  return checks;
}

const keys = (file: string) =>
  new Set(
    fs
      .readFileSync(file, "utf-8")
      .split("\n")
      .map((l) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(l)?.[1])
      .filter((k): k is string => Boolean(k)),
  );

/** Web, mobile and the root must resolve one React: two copies break hooks. */
export function reactCheck(root: string): Check[] {
  const versions = new Map<string, string>();
  for (const rel of ["package.json", "apps/web/package.json", "apps/mobile/package.json"]) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const json = JSON.parse(fs.readFileSync(file, "utf-8"));
    const v = json.dependencies?.react ?? json.devDependencies?.react;
    if (v) versions.set(rel, v);
  }
  if (versions.size < 2) return [];
  const distinct = new Set(versions.values());
  return [
    distinct.size === 1
      ? { name: "React", state: "ok", detail: `one version everywhere (${[...distinct][0]})` }
      : {
          name: "React",
          state: "fail",
          detail: [...versions].map(([f, v]) => `${f} ${v}`).join(", "),
          fix: "Pin every react to the version apps/mobile uses: Expo decides it",
        },
  ];
}

const UI_IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](next|react|react-dom|react-native|expo)(?:\/[^"']*)?["']/;
const INFRA_IMPORT = /from\s+["'][./]+\/infrastructure\//;

/**
 * The hexagon's rule: packages/core knows no UI framework, and its domain and
 * application layers do not reach into infrastructure.
 */
export function coreImportCheck(root: string): Check {
  const src = path.join(root, "packages/core/src");
  const broken: string[] = [];
  for (const file of findFiles(src, (f) => /\.tsx?$/.test(f))) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf-8");
    const inner = /\/src\/(domain|application|ports)\//.test(file);
    text.split("\n").forEach((line, i) => {
      const ui = UI_IMPORT.exec(line);
      if (ui) broken.push(`${rel}:${i + 1} imports ${ui[1]}`);
      else if (inner && INFRA_IMPORT.test(line)) broken.push(`${rel}:${i + 1} imports infrastructure`);
    });
  }
  return broken.length === 0
    ? { name: "core imports", state: "ok", detail: "no UI framework, no infrastructure in domain/application" }
    : {
        name: "core imports",
        state: "fail",
        detail: broken.slice(0, 5).join("; ") + (broken.length > 5 ? ` (+${broken.length - 5} more)` : ""),
        fix: "Move that code to apps/* or infrastructure/, and reach it through a port",
      };
}

function specgateCheck(project: Project): Check {
  return project.specgate
    ? { name: "Specgate", state: "ok", detail: "adopted: spec.md and the traceability matrix are there" }
    : {
        name: "Specgate",
        state: "warn",
        detail: "not adopted yet",
        fix: 'npx specgate adopt --no-capabilities && npx specgate config set test_cmd "npm test"',
      };
}

function findFiles(dir: string, match: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".next", ".expo", "dist", "target", "build"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findFiles(full, match));
    else if (match(full)) out.push(full);
  }
  return out;
}
