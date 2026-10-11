import { execa } from "execa";
import type { ForjaConfig } from "../config/schema.js";

export interface PostinstallOptions {
  targetDir: string;
  config: ForjaConfig;
  initGit: boolean;
  installDeps: boolean;
}

export async function runPostinstall(opts: PostinstallOptions): Promise<void> {
  const { targetDir, config, initGit, installDeps } = opts;

  if (initGit) {
    await execa("git", ["init"], { cwd: targetDir });
    await execa("git", ["add", "-A"], { cwd: targetDir });
    await execa("git", ["commit", "-m", "chore: scaffold inicial con forja"], { cwd: targetDir });
  }

  if (installDeps) {
    await execa(config.pm, ["install"], { cwd: targetDir, stdio: "inherit" });
  }
}

export function nextSteps(config: ForjaConfig, installDeps: boolean): string[] {
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
  return steps;
}
