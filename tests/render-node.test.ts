import { describe, expect, it } from "vitest";
import { defaultConfig, parseForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";

describe("node rendering (v0.1) without regressions", () => {
  it("the default project generates the same output as always", async () => {
    const config = parseForjaConfig(defaultConfig("acme"));
    const { tree, vol } = await renderProject(config, planRecipes(config));
    for (const f of ["packages/core/src/domain/entities/User.ts", "apps/web/app/(auth)/login/page.tsx",
      "apps/mobile/app/(auth)/login.tsx", "docker-compose.yml", ".env.example", "forja.config.json"]) {
      expect(tree).toContain(f);
    }
    expect(tree.some((f) => f.startsWith("apps/api/"))).toBe(false);
    const cfg = JSON.parse((vol.toJSON() as Record<string, string>)["/forja.config.json"]);
    expect(cfg.backend).toBe("node");
  });

  it("node with Specgate and CI", async () => {
    const config = parseForjaConfig({ ...defaultConfig("acme"), extras: ["lint", "ci", "specgate"] });
    const { tree } = await renderProject(config, planRecipes(config));
    expect(tree).toEqual(expect.arrayContaining([".github/workflows/ci.yml", "docs/brief.md", "docs/specgate.md"]));
  });
});
