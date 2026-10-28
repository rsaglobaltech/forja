import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";
import { specgateVersion } from "../src/recipes/specgate.js";
import { progress, targetProblem } from "../src/engine/target.js";
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
