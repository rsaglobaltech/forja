import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject, writeToDisk } from "../src/engine/renderer.js";
import { doctor, type Probe } from "../src/doctor/doctor.js";
import { findProject } from "../src/project/project.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function generate(config: ForjaConfig) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "forja-doctor-"));
  dirs.push(root);
  writeToDisk(await renderProject(config, planRecipes(config)), root);
  return { project: findProject(root), root };
}

/** Every tool present and working, unless `missing` says otherwise. */
const probe = (nodeVersion = "24.1.0", missing: string[] = []): Probe => ({
  nodeVersion,
  async run(cmd) {
    if (missing.includes(cmd)) return { ok: false, stdout: "" };
    if (cmd === "java") return { ok: true, stdout: 'openjdk version "21.0.4" 2024-07-16' };
    return { ok: true, stdout: "1.2.3" };
  },
});

const state = (checks: { name: string; state: string }[], name: string) =>
  checks.find((c) => c.name === name)?.state;

describe("forja doctor", () => {
  it("a fresh Node project: tools fine, the .env still to create", async () => {
    const { project } = await generate(parseForjaConfig(defaultConfig("acme")));
    const checks = await doctor(project, probe());
    expect(state(checks, "Node.js")).toBe("ok");
    expect(state(checks, "Docker")).toBe("ok");
    expect(state(checks, "React")).toBe("ok");
    expect(state(checks, "core imports")).toBe("ok");
    expect(state(checks, "env (root)")).toBe("warn");
  });

  it("an old Node and a stopped Docker fail", async () => {
    const { project } = await generate(parseForjaConfig(defaultConfig("acme")));
    const checks = await doctor(project, probe("20.11.0", ["docker"]));
    expect(state(checks, "Node.js")).toBe("fail");
    expect(state(checks, "Docker")).toBe("fail");
  });

  it("names the keys a .env lacks", async () => {
    const { project, root } = await generate(parseForjaConfig(defaultConfig("acme")));
    fs.writeFileSync(path.join(root, ".env"), "APP_URL=http://localhost:3000\n");
    const env = (await doctor(project, probe())).find((c) => c.name === "env (root)");
    expect(env?.state).toBe("warn");
    expect(env?.detail).toContain("DATABASE_URL");
  });

  it("catches a UI import in the core and infrastructure reached from the domain", async () => {
    const { project, root } = await generate(parseForjaConfig(defaultConfig("acme")));
    const user = path.join(root, "packages/core/src/domain/entities/User.ts");
    fs.appendFileSync(user, '\nimport { useState } from "react";\nimport { db } from "../../infrastructure/database/db.js";\n');
    const core = (await doctor(project, probe())).find((c) => c.name === "core imports");
    expect(core?.state).toBe("fail");
    expect(core?.detail).toMatch(/User\.ts:\d+ imports react/);
    expect(core?.detail).toMatch(/User\.ts:\d+ imports infrastructure/);
  });

  it("two Reacts fail", async () => {
    const { project, root } = await generate(parseForjaConfig(defaultConfig("acme")));
    const web = path.join(root, "apps/web/package.json");
    const json = JSON.parse(fs.readFileSync(web, "utf-8"));
    json.dependencies.react = "19.0.0";
    fs.writeFileSync(web, JSON.stringify(json));
    expect(state(await doctor(project, probe()), "React")).toBe("fail");
  });

  it("Java: the JDK is checked, and Specgate not adopted is a warning", async () => {
    const { project } = await generate(parseForjaConfig(defaultJavaConfig("shop", "spring")));
    const checks = await doctor(project, probe());
    expect(state(checks, "Java")).toBe("ok");
    expect(state(checks, "core imports")).toBeUndefined();
    expect(state(checks, "Specgate")).toBe("warn");
    expect(state(await doctor(project, probe("24.1.0", ["java"])), "Java")).toBe("fail");
  });
});
