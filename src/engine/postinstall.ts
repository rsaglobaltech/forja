import { execa } from "execa";
import { isJava, type ForjaConfig } from "../config/schema.js";

export interface PostinstallOptions {
  targetDir: string;
  config: ForjaConfig;
  initGit: boolean;
  installDeps: boolean;
}

export interface PostinstallResult {
  /** Specgate was adopted (init + test_cmd). When not, nextSteps gives the commands. */
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
      await specgate("init", "--no-capabilities");
      await specgate("config", "set", "test_cmd", "npm test");
      specgateAdopted = true;
      if (initGit) {
        await git("add", "-A");
        await git("commit", "-m", "chore: adopt Specgate (init, test_cmd)");
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
  if (config.db === "postgres-docker" || config.auth === "oauth2") {
    steps.push(
      "docker compose up -d          # " +
        [
          config.db === "postgres-docker" ? "PostgreSQL" : "",
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
  steps.push(...specgateSteps(config, result));
  return steps;
}

function specgateSteps(
  config: ForjaConfig,
  result?: PostinstallResult,
): string[] {
  if (!config.extras.includes("specgate")) return [];
  // Specgate's own next step after `init` is the brief: forja wrote a
  // docs/brief.md to fill in, and `specgate draft` takes it from there.
  const adopt = result?.specgateAdopted
    ? []
    : [
        "npx specgate init --no-capabilities",
        'npx specgate config set test_cmd "npm test"',
      ];
  return [
    ...adopt,
    "npx specgate draft               # after you fill in docs/brief.md — see docs/specgate.md",
    "npx specgate                     # where the specification stands, and what to run next",
  ];
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
