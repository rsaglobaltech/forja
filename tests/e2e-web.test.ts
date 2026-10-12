import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, parseForjaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planRecipes } from "../src/engine/planner.js";
import { renderProject } from "../src/engine/renderer.js";
import { nextSteps } from "../src/engine/postinstall.js";

async function files(config: ForjaConfig) {
  const { vol } = await renderProject(config, planRecipes(config));
  const all = vol.toJSON() as Record<string, string>;
  return (path: string) => all[`/${path}`];
}

const withE2e = (config: ForjaConfig) => parseForjaConfig({ ...config, tests: [...config.tests, "e2e-web"] });

describe("--tests e2e-web", () => {
  it("node with sessions: Playwright in apps/web, the smoke test and the sign-in flow", async () => {
    const config = withE2e(defaultConfig("acme"));
    const file = await files(config);
    const web = JSON.parse(file("apps/web/package.json"));
    expect(web.devDependencies["@playwright/test"]).toBe("~1.63.0");
    expect(web.scripts["test:e2e"]).toBe("playwright test");
    expect(JSON.parse(file("package.json")).scripts["test:e2e"]).toBe("npm run test:e2e --workspace apps/web");
    expect(file("apps/web/e2e/smoke.spec.ts")).toContain('toContainText("acme")');
    expect(file("apps/web/e2e/auth.spec.ts")).toContain('getByRole("button", { name: "Create account" })');
    expect(file("apps/web/e2e/tasks.spec.ts")).toBeUndefined();
    // Node needs no API server: only the web app is started.
    expect(file("apps/web/playwright.config.ts")).not.toContain("dev:api");
    expect(nextSteps(config, true).join("\n")).toContain("npx playwright install chromium");
  });

  it("node without auth: the smoke test only", async () => {
    const file = await files(withE2e(parseForjaConfig({ ...defaultConfig("acme"), auth: "none", platforms: ["web"] })));
    expect(file("apps/web/e2e/smoke.spec.ts")).toBeTruthy();
    expect(file("apps/web/e2e/auth.spec.ts")).toBeUndefined();
  });

  for (const backend of ["spring", "quarkus"] as const) {
    it(`${backend}: Playwright starts the API too, and drives Keycloak`, async () => {
      const file = await files(withE2e(parseForjaConfig(defaultJavaConfig("shop", backend))));
      const config = file("apps/web/playwright.config.ts");
      expect(config).toContain('command: "npm run dev:api"');
      expect(config).toContain(backend === "spring" ? "8080/actuator/health" : "8080/q/health");
      const tasks = file("apps/web/e2e/tasks.spec.ts");
      expect(tasks).toContain('locator("#kc-login")');
      expect(tasks).toContain('"Mark as done"');
    });
  }

  it("java without auth: the task flow, no Keycloak", async () => {
    const file = await files(withE2e(parseForjaConfig({ ...defaultJavaConfig("shop", "spring"), auth: "none" })));
    const tasks = file("apps/web/e2e/tasks.spec.ts");
    expect(tasks).toContain('"Go to my tasks"');
    expect(tasks).not.toContain("kc-login");
  });

  it("the generated CI runs it, after the stack it needs", async () => {
    const node = await files(parseForjaConfig({ ...withE2e(defaultConfig("acme")), extras: ["ci"] }));
    expect(node(".github/workflows/ci.yml")).toContain("npm run test:e2e");
    expect(node(".github/workflows/ci.yml")).not.toContain("docker compose up");
    const java = await files(parseForjaConfig({ ...withE2e(defaultJavaConfig("shop", "spring")), extras: ["ci"] }));
    expect(java(".github/workflows/ci.yml")).toMatch(/docker compose up -d --wait[\s\S]*npm run test:e2e/);
  });

  it("is off by default", async () => {
    const file = await files(parseForjaConfig(defaultConfig("acme")));
    expect(file("apps/web/playwright.config.ts")).toBeUndefined();
  });
});
