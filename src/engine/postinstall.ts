import { execa } from "execa";
import { isJava, type ForjaConfig } from "../config/schema.js";

export interface PostinstallOptions {
  targetDir: string;
  config: ForjaConfig;
  initGit: boolean;
  installDeps: boolean;
}

export interface PostinstallResult {
  /** Specgate was adopted (adopt + test_cmd). When not, nextSteps gives the commands. */
  specgateAdopted: boolean;
}

export async function runPostinstall(
  opts: PostinstallOptions,
): Promise<PostinstallResult> {
  const { targetDir, config, initGit, installDeps } = opts;
  const git = (...args: string[]) => execa("git", args, { cwd: targetDir });

  if (initGit) {
    await git("init", "-b", "main");
    await git("add", "-A");
    await git("commit", "-m", "chore: scaffold with forja");
  }

  if (installDeps) {
    await execa(config.pm, ["install"], { cwd: targetDir, stdio: "inherit" });
  }

  let specgateAdopted = false;
  if (installDeps && config.extras.includes("specgate")) {
    try {
      const specgate = (...args: string[]) =>
        execa("npx", ["--no-install", "specgate", ...args], { cwd: targetDir });
      await specgate("adopt", "--no-capabilities");
      await specgate("config", "set", "test_cmd", "npm test");
      specgateAdopted = true;
      // The architecture check joins the gate (Specgate ≥ 0.20, ADR-0028). On
      // an older Specgate the key is unknown: the gate stays as it was.
      if (hasArchScript(config)) {
        await specgate("config", "set", "arch_cmd", "npm run arch").catch(() => undefined);
      }
      if (initGit) {
        await git("add", "-A");
        await git("commit", "-m", "chore: adopt Specgate");
      }
    } catch {
      // No network or no npm: the project works anyway, and nextSteps gives the commands.
    }
  }

  return { specgateAdopted };
}

export function nextSteps(
  config: ForjaConfig,
  installDeps: boolean,
  result?: PostinstallResult,
): string[] {
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
  steps.push(...e2eSteps(config));
  steps.push(...specgateSteps(config, result));
  return steps;
}

function nextStepsJava(
  config: ForjaConfig,
  installDeps: boolean,
  result?: PostinstallResult,
): string[] {
  const web = config.platforms.includes("web");
  const steps: string[] = [`cd ${config.name}`];
  // Quarkus starts its own PostgreSQL in dev and tests (Dev Services); the
  // compose one serves Spring, and Keycloak serves both.
  const composeDb = config.db === "postgres-docker" && config.backend === "spring";
  if (composeDb || config.auth === "oauth2") {
    steps.push(
      "docker compose up -d          # " +
        [
          composeDb ? "PostgreSQL" : "",
          config.auth === "oauth2" ? "Keycloak (demo / demo)" : "",
        ]
          .filter(Boolean)
          .join(" + "),
    );
  }
  if (!installDeps) steps.push("npm install");
  steps.push(
    `npm run dev:api               # http://localhost:8080 · ${config.backend === "spring" ? "/swagger-ui.html" : "/q/swagger-ui"}`,
  );
  if (web) steps.push("npm run dev:web               # http://localhost:3000");
  steps.push("npm test                      # API" + (web ? " + web" : ""));
  steps.push(...e2eSteps(config));
  steps.push(...specgateSteps(config, result));
  return steps;
}

function e2eSteps(config: ForjaConfig): string[] {
  if (!config.tests.includes("e2e-web")) return [];
  return [
    "npx playwright install chromium  # once: the browser the end-to-end tests drive",
    `${config.pm} run test:e2e  # ${isJava(config) ? "the web app, the API" + (config.auth === "oauth2" ? " and Keycloak" : "") : "the sign-in flow"} in a real browser`,
  ];
}

function specgateSteps(
  config: ForjaConfig,
  result?: PostinstallResult,
): string[] {
  if (!config.extras.includes("specgate")) return [];
  // Specgate's own next step after `adopt` is the brief: forja wrote a
  // docs/brief.md to fill in, and `specgate draft` takes it from there.
  const adopt = result?.specgateAdopted
    ? []
    : [
        "npx specgate adopt --no-capabilities",
        'npx specgate config set test_cmd "npm test"',
        ...(hasArchScript(config) ? ['npx specgate config set arch_cmd "npm run arch"'] : []),
      ];
  return [
    ...adopt,
    "npx specgate draft               # after you fill in docs/brief.md — see docs/specgate.md",
    "npx specgate                     # where the specification stands, and what to run next",
  ];
}

/** The project has `npm run arch`: the core's rules on Node, ArchUnit on Java. */
export function hasArchScript(config: ForjaConfig): boolean {
  return !isJava(config) || config.archunit;
}

/** `cmd   # why` lines with every `#` in one column, whatever wrote them. */
export function alignComments(lines: string[]): string[] {
  const split = lines.map((l) => {
    const at = l.indexOf("  #");
    return at === -1 ? [l, ""] : [l.slice(0, at).trimEnd(), l.slice(at).trim()];
  });
  const width = Math.max(
    ...split.filter(([, c]) => c).map(([cmd]) => cmd.length),
  );
  return split.map(([cmd, comment]) =>
    comment ? `${cmd.padEnd(width + 2)}${comment}` : cmd,
  );
}
