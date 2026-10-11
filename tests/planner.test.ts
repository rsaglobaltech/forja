import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, type ForjaConfig } from "../src/config/schema.js";
import { planJava, planRecipes } from "../src/engine/planner.js";

const ids = (c: ForjaConfig) => planRecipes(c).map((r) => r.id);

describe("planificador", () => {
  it("node mantiene el orden de v0.1", () => {
    expect(ids(defaultConfig("acme"))).toEqual([
      "base", "shared", "core-hexagonal", "db-postgres-docker", "web", "mobile", "auth-sessions", "mailer-console",
      "design-tailwind", "extras-lint",
    ]);
  });

  it("Java completo: API, compose, Keycloak, web antes que Tailwind, extras al final", () => {
    expect(planJava(defaultJavaConfig("acme", "spring"))).toEqual([
      "base", "api-spring", "compose", "keycloak", "shared", "web-java", "design-tailwind",
      "extras-lint", "ci", "docker-java", "specgate",
    ]);
  });

  it("Java solo API, en memoria y sin auth: sin compose ni web", () => {
    const c = { ...defaultJavaConfig("acme", "quarkus"), platforms: [], db: "none", auth: "none", extras: [] } as ForjaConfig;
    expect(planJava(c)).toEqual(["base", "api-quarkus"]);
  });

  it("todas las recetas planificadas existen", () => {
    for (const backend of ["spring", "quarkus"] as const) {
      expect(() => planRecipes(defaultJavaConfig("acme", backend))).not.toThrow();
    }
  });
});
