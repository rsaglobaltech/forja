import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";
import { specgateVersion } from "../src/recipes/specgate.js";
import { progress, resolveTarget, targetProblem, unattendedProblem } from "../src/engine/target.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * What building truck-flote with forja 1.0.1 found (that project's
 * docs/specgate-issues.md, F5–F8).
 */

async function render(config: ForjaConfig) {
  const { vol } = await renderProject(config, planRecipes(config));
  const files = vol.toJSON() as Record<string, string>;
  return (p: string) => files[`/${p}`];
}

describe("F7: the Specgate a project gets", () => {
  it("is the one forja was released with, as a caret range", async () => {
    const read = await render(parseForjaConfig({ ...defaultJavaConfig("fleet", "spring"), extras: ["specgate"] }));
    expect(JSON.parse(read("package.json")).devDependencies["@rsaglobaltech/specgate"]).toBe(`^${specgateVersion({})}`);
    expect(specgateVersion({})).not.toBe("0.20.0");
  });

  it("is the one that invoked forja, when Specgate says so", () => {
    expect(specgateVersion({ SPECGATE_VERSION: "0.28.3" })).toBe("0.28.3");
    expect(specgateVersion({ SPECGATE_VERSION: "not a version" })).toBe(specgateVersion({}));
  });
});

describe("F8: ESLint leaves build output alone", () => {
  it("ignores Maven's target/ and Gradle's build/", async () => {
    for (const config of [
      parseForjaConfig({ ...defaultJavaConfig("fleet", "spring"), extras: ["lint"] }),
      parseForjaConfig({ ...defaultConfig("shop"), extras: ["lint"] }),
    ]) {
      const eslint = (await render(config))("eslint.config.mjs");
      expect(eslint).toContain('"**/target/**"');
      expect(eslint).toContain('"**/build/**"');
    }
  });
});

describe("F5, F11: the target folder", () => {
  it("is used when empty or absent", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-target-"));
    expect(targetProblem(path.join(dir, "absent"), ["README.md"])).toBeNull();
    fs.mkdirSync(path.join(dir, "empty"));
    expect(targetProblem(path.join(dir, "empty"), ["README.md"])).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("keeps a repository and a brief, and refuses only what forja would overwrite (F11)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-target-"));
    fs.mkdirSync(path.join(dir, ".git"));
    fs.writeFileSync(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main");
    fs.writeFileSync(path.join(dir, "brief.md"), "the client's brief");
    expect(targetProblem(dir, ["README.md", "docs/brief.md"])).toBeNull();
    fs.writeFileSync(path.join(dir, "README.md"), "mine");
    expect(targetProblem(dir, ["README.md", "docs/brief.md"])).toMatch(/would write: README\.md/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("F6: progress without a terminal", () => {
  it("prints the start and the end once each, no spinner frames", () => {
    const lines: string[] = [];
    const p = progress(false, (l) => lines.push(l));
    p.start("Running git init and the install…");
    p.stop("Done.");
    expect(lines).toEqual(["Running git init and the install…", "Done."]);
  });
});

describe("F12: the Maven wrapper from npm scripts on Windows", () => {
  it("goes through a Node launcher, never ./mvnw", async () => {
    for (const backend of ["spring", "quarkus"] as const) {
      const config = parseForjaConfig({ ...defaultJavaConfig("fleet", backend), extras: ["lint"] });
      const read = await render(config);
      const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
      for (const [name, cmd] of Object.entries(scripts)) {
        expect(cmd, name).not.toContain("./mvnw");
      }
      expect(scripts["test:api"]).toBe("node scripts/mvnw.mjs -q -B verify");
      expect(read("scripts/mvnw.mjs")).toContain('"mvnw.cmd"');
      expect(read("eslint.config.mjs")).toContain('"scripts/*.mjs"');
    }
  });
});

describe("F13: what a build writes stays out of git", () => {
  it("ignores next-env.d.ts and *.tsbuildinfo, Java and Node alike", async () => {
    for (const config of [
      parseForjaConfig({ ...defaultJavaConfig("fleet", "spring") }),
      parseForjaConfig({ ...defaultConfig("shop") }),
    ]) {
      const ignore = (await render(config))(".gitignore").split(/\r?\n/);
      expect(ignore).toContain("next-env.d.ts");
      expect(ignore).toContain("*.tsbuildinfo");
    }
  });
});

describe("F14: run inside the brief's repository", () => {
  const repo = (name: string, files: string[]) => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "forja-f14-")), name);
    fs.mkdirSync(dir);
    for (const f of files) fs.mkdirSync(path.join(dir, f), { recursive: true });
    return dir;
  };

  it("generates into the folder when it is the project's repository", () => {
    const dir = repo("truck-flote", [".git"]);
    expect(resolveTarget(dir, "truck-flote")).toEqual({ dir, here: true });
  });

  it("does so for a folder named like the project that holds the brief", () => {
    const dir = repo("truck-flote", []);
    fs.writeFileSync(path.join(dir, "brief.md"), "# Brief\n");
    expect(resolveTarget(dir, "truck-flote").here).toBe(true);
  });

  it("creates the project's folder anywhere else", () => {
    const parent = repo("projects", [".git"]);
    expect(resolveTarget(parent, "truck-flote")).toEqual({ dir: path.join(parent, "truck-flote"), here: false });
    const plain = repo("truck-flote", []);
    expect(resolveTarget(plain, "truck-flote").here).toBe(false);
  });

  it("keeps a folder of that name already inside", () => {
    const dir = repo("truck-flote", [".git", "truck-flote"]);
    expect(resolveTarget(dir, "truck-flote").here).toBe(false);
  });
});

describe("F15: no terminal, no questions", () => {
  it("names --yes and --config when nothing can be asked", () => {
    expect(unattendedProblem({}, { stdin: false, stdout: true })).toMatch(/--yes.*--config/);
    expect(unattendedProblem({}, { stdin: true, stdout: false })).toMatch(/--yes/);
  });

  it("lets the wizard run in a terminal, and unattended runs anywhere", () => {
    expect(unattendedProblem({}, { stdin: true, stdout: true })).toBeNull();
    expect(unattendedProblem({ yes: true }, { stdin: false, stdout: false })).toBeNull();
    expect(unattendedProblem({ config: "forja.config.json" }, { stdin: false, stdout: false })).toBeNull();
  });
});

describe("F16: a new Java project has no known vulnerability", () => {
  it("pins Spring Boot 4.1.2, whose Tomcat and Jackson OSV lists clean", async () => {
    const read = await render(parseForjaConfig({ ...defaultJavaConfig("fleet", "spring") }));
    expect(read("apps/api/pom.xml")).toMatch(/<artifactId>spring-boot-starter-parent<\/artifactId>\s*<version>4\.1\.2<\/version>/);
  });
});
