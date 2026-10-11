import { describe, expect, it } from "vitest";
import { defaultConfig, defaultJavaConfig, javaPackageOf, parseForjaConfig } from "../src/config/schema.js";

describe("configuración", () => {
  it("los valores por defecto son válidos (node, spring, quarkus)", () => {
    expect(() => parseForjaConfig(defaultConfig("acme"))).not.toThrow();
    expect(() => parseForjaConfig(defaultJavaConfig("acme", "spring"))).not.toThrow();
    expect(() => parseForjaConfig(defaultJavaConfig("acme", "quarkus"))).not.toThrow();
  });

  it("un forja.config.json antiguo (sin backend) sigue siendo node", () => {
    const { backend, javaPackage, archunit, ...antiguo } = defaultConfig("acme");
    expect(parseForjaConfig(antiguo).backend).toBe("node");
  });

  it("Java: sin móvil, auth oauth2|none, db postgres-docker|none", () => {
    const base = defaultJavaConfig("acme", "spring");
    expect(() => parseForjaConfig({ ...base, platforms: ["web", "mobile"] })).toThrow(/mobile/);
    expect(() => parseForjaConfig({ ...base, auth: "sessions" })).toThrow(/oauth2 \| none/);
    expect(() => parseForjaConfig({ ...base, db: "supabase" })).toThrow(/postgres-docker \| none/);
    expect(() => parseForjaConfig({ ...base, platforms: [] })).not.toThrow();
  });

  it("ArchUnit, OAuth2 y javaPackage exigen backend Java", () => {
    const node = defaultConfig("acme");
    expect(() => parseForjaConfig({ ...node, archunit: true })).toThrow(/archunit/);
    expect(() => parseForjaConfig({ ...node, auth: "oauth2" })).toThrow(/oauth2/);
    expect(() => parseForjaConfig({ ...node, javaPackage: "com.acme" })).toThrow(/javaPackage/);
  });

  it("el paquete Java se valida y por defecto sale del nombre", () => {
    const base = defaultJavaConfig("mi-tienda", "quarkus");
    expect(javaPackageOf(base)).toBe("com.mitienda");
    expect(() => parseForjaConfig({ ...base, javaPackage: "Com.Acme" })).toThrow(/Paquete Java/);
    expect(() => parseForjaConfig({ ...base, javaPackage: "acme" })).toThrow(/Paquete Java/);
  });
});
