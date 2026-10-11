import { execa } from "execa";
import { isJava, type ForjaConfig } from "../config/schema.js";

export interface PostinstallOptions {
  targetDir: string;
  config: ForjaConfig;
  initGit: boolean;
  installDeps: boolean;
}

export interface PostinstallResult {
  /** Specgate quedó adoptado (init + test_cmd). Si no, nextSteps lo indica. */
  specgateAdopted: boolean;
}

export async function runPostinstall(opts: PostinstallOptions): Promise<PostinstallResult> {
  const { targetDir, config, initGit, installDeps } = opts;
  const git = (...args: string[]) => execa("git", args, { cwd: targetDir });

  if (initGit) {
    await git("init", "-b", "main");
    await git("add", "-A");
    await git("commit", "-m", "chore: scaffold inicial con forja");
  }

  if (installDeps) {
    await execa(config.pm, ["install"], { cwd: targetDir, stdio: "inherit" });
  }

  let specgateAdopted = false;
  if (installDeps && config.extras.includes("specgate")) {
    try {
      const specgate = (...args: string[]) => execa("npx", ["specgate", ...args], { cwd: targetDir });
      await specgate("init", "--no-capabilities");
      await specgate("config", "set", "test_cmd", "npm test");
      specgateAdopted = true;
      if (initGit) {
        await git("add", "-A");
        await git("commit", "-m", "chore: adoptar Specgate (init, test_cmd)");
      }
    } catch {
      // Sin red o sin npm: el proyecto sirve igual; nextSteps da los comandos.
    }
  }

  return { specgateAdopted };
}

export function nextSteps(config: ForjaConfig, installDeps: boolean, result?: PostinstallResult): string[] {
  if (isJava(config)) return nextStepsJava(config, installDeps, result);
  const steps: string[] = [`cd ${config.name}`];
  if (!installDeps) steps.push(`${config.pm} install`);
  if (config.db === "postgres-docker") {
    steps.push("docker compose up -d");
    steps.push(`${config.pm} run db:push`);
  }
  if (config.platforms.includes("web")) {
    steps.push(`${config.pm} run dev          # http://localhost:3000/login`);
  }
  if (config.platforms.includes("mobile")) {
    steps.push(`${config.pm} run mobile       # Expo Go`);
  }
  if (config.tests.includes("unit") || config.tests.includes("integration")) {
    steps.push(`${config.pm} test             # unit + integration`);
  }
  steps.push(...specgateSteps(config, result));
  return steps;
}

function nextStepsJava(config: ForjaConfig, installDeps: boolean, result?: PostinstallResult): string[] {
  const web = config.platforms.includes("web");
  const steps: string[] = [`cd ${config.name}`];
  if (config.db === "postgres-docker" || config.auth === "oauth2") {
    steps.push("docker compose up -d          # " +
      [config.db === "postgres-docker" ? "PostgreSQL" : "", config.auth === "oauth2" ? "Keycloak (demo / demo)" : ""]
        .filter(Boolean).join(" + "));
  }
  if (!installDeps) steps.push("npm install");
  steps.push(`npm run dev:api               # http://localhost:8080 · ${config.backend === "spring" ? "/swagger-ui.html" : "/q/swagger-ui"}`);
  if (web) steps.push("npm run dev:web               # http://localhost:3000");
  steps.push("npm test                      # API" + (web ? " + web" : ""));
  steps.push(...specgateSteps(config, result));
  return steps;
}

function specgateSteps(config: ForjaConfig, result?: PostinstallResult): string[] {
  if (!config.extras.includes("specgate")) return [];
  if (result?.specgateAdopted) {
    return ["npx specgate done REQ-001        # la línea base (ver docs/specgate.md)"];
  }
  return [
    "npx specgate init --no-capabilities",
    'npx specgate config set test_cmd "npm test"',
    "npx specgate done REQ-001        # ver docs/specgate.md",
  ];
}
