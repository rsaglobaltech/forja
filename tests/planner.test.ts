import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planJava, planRecipes } from "../src/engine/planner.js";

const ids = (c: ForjaConfig) => planRecipes(c).map((r) => r.id);

describe("planner", () => {
  it("node keeps the v0.1 order", () => {
    expect(ids(defaultConfig("acme"))).toEqual([
      "base", "shared", "core-hexagonal", "db-postgres-docker", "web", "mobile", "auth-sessions", "mailer-console",
      "design-tailwind", "extras-lint",
    ]);
  });

  it("full Java: API, compose, Keycloak, web before Tailwind, extras last", () => {
    expect(planJava(defaultJavaConfig("acme", "spring"))).toEqual([
      "base", "api-spring", "compose", "keycloak", "shared", "web-java", "design-tailwind",
      "extras-lint", "ci", "docker-java", "specgate",
    ]);
  });

  it("Java API only, in-memory and no auth: no compose, no web", () => {
    const c = { ...defaultJavaConfig("acme", "quarkus"), platforms: [], db: "none", auth: "none", extras: [] } as ForjaConfig;
    expect(planJava(c)).toEqual(["base", "api-quarkus"]);
  });

  it("every planned recipe exists", () => {
    for (const backend of ["spring", "quarkus"] as const) {
      expect(() => planRecipes(defaultJavaConfig("acme", backend))).not.toThrow();
    }
  });
});
