import { describe, expect, it } from "vitest";
import { defaultConfig, parseForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";

describe("node rendering (v0.1) without regressions", () => {
  it("the default project generates the same output as always", async () => {
    const config = parseForjaConfig(defaultConfig("acme"));
    const { tree, vol } = await renderProject(config, planRecipes(config));
    for (const f of [
      "packages/core/src/domain/entities/User.ts",
      "apps/web/app/(auth)/login/page.tsx",
      "apps/mobile/app/(auth)/login.tsx",
      "docker-compose.yml",
      ".env.example",
      "forja.config.json",
    ]) {
      expect(tree).toContain(f);
    }
    expect(tree.some((f) => f.startsWith("apps/api/"))).toBe(false);
    const cfg = JSON.parse(
      (vol.toJSON() as Record<string, string>)["/forja.config.json"],
    );
    expect(cfg.backend).toBe("node");
  });

  it("node with Specgate and CI", async () => {
    const config = parseForjaConfig({
      ...defaultConfig("acme"),
      extras: ["lint", "ci", "specgate"],
    });
    const { tree } = await renderProject(config, planRecipes(config));
    expect(tree).toEqual(
      expect.arrayContaining([
        ".github/workflows/ci.yml",
        "docs/brief.md",
        "docs/specgate.md",
      ]),
    );
  });

  // Phase 2: what a Node project gets must be what was proven to work
  // together (scripts/verify-generated.sh node), not a version picked alone.
  const read = async (overrides: Partial<ReturnType<typeof defaultConfig>>) => {
    const config = parseForjaConfig({
      ...defaultConfig("my-app"),
      ...overrides,
    });
    const { vol } = await renderProject(config, planRecipes(config));
    const files = vol.toJSON() as Record<string, string>;
    return (path: string) => files[`/${path}`];
  };

  it("web, mobile and the root share one React, the one Expo pins", async () => {
    const file = await read({});
    const react = (path: string) => JSON.parse(file(path)).dependencies.react;
    expect(react("apps/mobile/package.json")).toBe("19.2.3");
    expect(react("apps/web/package.json")).toBe("19.2.3");
    expect(react("package.json")).toBe("19.2.3");
    expect(
      JSON.parse(file("apps/mobile/package.json")).dependencies.expo,
    ).toMatch(/^~57\./);
    expect(JSON.parse(file("apps/web/package.json")).dependencies.next).toMatch(
      /^\^16\./,
    );
  });

  it("the web app builds with webpack, and Next 16's proxy replaces middleware", async () => {
    const file = await read({});
    const web = JSON.parse(file("apps/web/package.json"));
    expect(web.scripts.build).toBe("next build --webpack");
    expect(file("apps/web/proxy.ts")).toMatch(/export function proxy/);
    expect(file("apps/web/middleware.ts")).toBeUndefined();
    expect(file("apps/web/next.config.ts")).not.toMatch(
      /fileURLToPath\(import\.meta\.url\)/,
    );
  });

  it("the mobile app id is valid on Android: letters, digits and dots only", async () => {
    const file = await read({});
    expect(file("apps/mobile/app.config.ts")).toMatch(
      /package: "com\.myapp\.myapp"/,
    );
    expect(file("apps/mobile/app.config.ts")).not.toMatch(/newArchEnabled/);
  });

  it("the core carries bcryptjs whatever the auth, and imports only what it uses", async () => {
    for (const auth of ["sessions", "none"] as const) {
      const file = await read({ auth, platforms: ["web"] });
      expect(
        JSON.parse(file("packages/core/package.json")).dependencies.bcryptjs,
      ).toBeTruthy();
    }
    const noDb = await read({ db: "none" });
    expect(
      noDb("packages/core/src/infrastructure/config/container.ts"),
    ).not.toMatch(/import \{[^}]*hasDatabase|hasDatabase\(\) \?/);
  });
});
